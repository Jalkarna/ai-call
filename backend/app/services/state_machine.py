"""
State Machine for Call Flow Management

Manages call states and transitions with:
- Deterministic state machine
- Confidence threshold validation
- Escalation logic
- Timeout handling
"""

import os
import asyncio
from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import structlog

logger = structlog.get_logger()


class CallState(str, Enum):
    """States in the call flow."""
    INIT = "init"                # Initial state after call pickup
    LISTENING = "listening"      # Receiving caller speech
    PROCESSING = "processing"    # Processing with Gemini
    ASKING = "asking"            # AI asking for information
    CONFIRMING = "confirming"    # Confirming extracted data
    FILING = "filing"            # Creating complaint in DB
    ESCALATED = "escalated"      # Transferred to human
    ENDED = "ended"              # Call completed


@dataclass
class CallSession:
    """Represents a call session with state."""
    session_id: str
    state: CallState = CallState.INIT
    language: str = "hi"
    caller_number: str = ""
    
    # Twilio stream info
    stream_sid: str = ""
    
    # Form data
    current_form: Dict[str, Any] = field(default_factory=dict)
    confidence_scores: Dict[str, float] = field(default_factory=dict)
    missing_fields: list = field(default_factory=list)
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    
    # Escalation tracking
    clarification_attempts: Dict[str, int] = field(default_factory=dict)
    max_clarification_attempts: int = 2
    
    # Timeouts
    inactivity_timeout_seconds: int = 300  # 5 minutes
    state_timeout_seconds: int = 60        # 1 minute per state
    
    def is_timeout(self) -> bool:
        """Check if session has timed out."""
        elapsed = (datetime.utcnow() - self.last_activity).total_seconds()
        return elapsed > self.inactivity_timeout_seconds
    
    def update_activity(self):
        """Update last activity timestamp."""
        self.last_activity = datetime.utcnow()
    
    def should_escalate(self, field_name: str) -> bool:
        """Check if field clarification should escalate."""
        attempts = self.clarification_attempts.get(field_name, 0)
        return attempts >= self.max_clarification_attempts
    
    def increment_clarification(self, field_name: str):
        """Increment clarification attempts for a field."""
        self.clarification_attempts[field_name] = \
            self.clarification_attempts.get(field_name, 0) + 1


class StateMachine:
    """
    State machine for managing call flow.
    
    Handles transitions, decision rules, and escalation logic.
    """
    
    # Confidence thresholds
    CONFIDENCE_HIGH = 0.8
    CONFIDENCE_MEDIUM = 0.7
    CONFIDENCE_LOW = 0.6
    
    # Required fields for complaint filing (address + pincode are required; no contact number)
    REQUIRED_FIELDS = ["description", "address", "pincode"]
    RECOMMENDED_FIELDS = ["complaint_type", "landmark", "locality"]
    
    # Emergency keywords for auto-escalation
    EMERGENCY_KEYWORDS = {
        "hi": ["आग", "दुर्घटना", "आपातकाल", "खतरा", "मदद", "पुलिस"],
        "gu": ["અગ્નિ", "અકસ્માત", "કટોકટી", "જોખમ", "મદદ", "પોલીસ"],
        "en": ["fire", "accident", "emergency", "danger", "help", "police"]
    }
    
    def __init__(self):
        """Initialize state machine."""
        logger.info("state_machine_initialized")
    
    def transition(
        self,
        session: CallSession,
        next_state: CallState,
        reason: str = ""
    ) -> CallSession:
        """
        Transition to a new state.
        
        Args:
            session: Current call session
            next_state: Target state
            reason: Reason for transition
        
        Returns:
            Updated session
        """
        previous_state = session.state
        session.state = next_state
        session.update_activity()
        
        logger.info(
            "state_transition",
            session_id=session.session_id,
            from_state=previous_state,
            to_state=next_state,
            reason=reason
        )
        
        return session
    
    def process_gemini_response(
        self,
        session: CallSession,
        gemini_response: Any,  # GeminiResponse
        transcript: str
    ) -> CallState:
        """
        Determine next state based on Gemini response.
        
        Args:
            session: Current call session
            gemini_response: Response from Gemini
            transcript: User's transcript
        
        Returns:
            Next state to transition to
        """
        # Check for emergency escalation
        if self._should_emergency_escalate(transcript, session.language):
            logger.warning("emergency_detected", session_id=session.session_id)
            return CallState.ESCALATED
        
        # Update form data
        if gemini_response.fields:
            session.current_form.update(gemini_response.fields)
            session.confidence_scores.update(gemini_response.confidence)
        
        session.missing_fields = gemini_response.missing_fields
        
        # Determine next state based on Gemini's next_action
        next_action = gemini_response.next_action
        
        if next_action == "escalate":
            return CallState.ESCALATED
        
        elif next_action == "end":
            return CallState.ENDED
        
        elif next_action == "file":
            # Check if we have all required fields with high confidence
            if self._can_file_complaint(session):
                return CallState.FILING
            else:
                # Missing data, need to ask
                return CallState.ASKING
        
        elif next_action == "confirm":
            # Verify we have good data before confirming
            if self._can_confirm(session):
                return CallState.CONFIRMING
            else:
                return CallState.ASKING
        
        elif next_action == "ask":
            # Check if we should escalate due to repeated failures
            if session.missing_fields:
                for field in session.missing_fields:
                    if session.should_escalate(field):
                        logger.warning(
                            "escalating_due_to_repeated_clarification",
                            session_id=session.session_id,
                            field=field
                        )
                        return CallState.ESCALATED
                    session.increment_clarification(field)
            
            return CallState.ASKING
        
        # Default: continue listening
        return CallState.LISTENING
    
    def _should_emergency_escalate(self, text: str, language: str) -> bool:
        """Check if text contains emergency keywords."""
        text_lower = text.lower()
        keywords = self.EMERGENCY_KEYWORDS.get(language, [])
        return any(keyword.lower() in text_lower for keyword in keywords)
    
    def _can_file_complaint(self, session: CallSession) -> bool:
        """Check if complaint can be filed."""
        # All required fields must be present
        for field in self.REQUIRED_FIELDS:
            if field not in session.current_form:
                return False
            # And have high confidence
            confidence = session.confidence_scores.get(field, 0.0)
            if confidence < self.CONFIDENCE_HIGH:
                return False
        
        return True
    
    def _can_confirm(self, session: CallSession) -> bool:
        """Check if ready to confirm data with user."""
        # Should have at least required fields
        for field in self.REQUIRED_FIELDS:
            if field not in session.current_form:
                return False
            # Medium confidence is acceptable for confirmation
            confidence = session.confidence_scores.get(field, 0.0)
            if confidence < self.CONFIDENCE_MEDIUM:
                return False
        
        return True
    
    def validate_field_confidence(
        self,
        field_name: str,
        confidence: float
    ) -> tuple[bool, str]:
        """
        Validate if field confidence is acceptable.
        
        Returns:
            (is_valid, reason)
        """
        if confidence >= self.CONFIDENCE_HIGH:
            return True, "high_confidence"
        elif confidence >= self.CONFIDENCE_MEDIUM:
            return True, "medium_confidence_needs_confirmation"
        elif confidence >= self.CONFIDENCE_LOW:
            return False, "low_confidence_re_ask"
        else:
            return False, "very_low_confidence_escalate"


# Global state machine instance
_state_machine: Optional[StateMachine] = None

def get_state_machine() -> StateMachine:
    """Get or create the singleton state machine instance."""
    global _state_machine
    if _state_machine is None:
        _state_machine = StateMachine()
    return _state_machine
