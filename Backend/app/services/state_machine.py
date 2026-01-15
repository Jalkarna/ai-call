"""
State Machine for Call Orchestration

Implements deterministic state transitions for call handling with:
- State management
- Transition rules
- Fallback handling
"""

from enum import Enum
from typing import Optional, Callable, Any
from dataclasses import dataclass, field
import asyncio


class CallState(str, Enum):
    """States in the call handling state machine."""
    IDLE = "idle"
    GREETING = "greeting"
    LISTENING = "listening"
    PROCESSING = "processing"
    ASKING = "asking"
    CONFIRMING = "confirming"
    FILING = "filing"
    ESCALATING = "escalating"
    TRANSFERRING = "transferring"
    ENDING = "ending"
    ERROR = "error"


class StateEvent(str, Enum):
    """Events that trigger state transitions."""
    CALL_STARTED = "call_started"
    GREETING_COMPLETE = "greeting_complete"
    USER_SPOKE = "user_spoke"
    TRANSCRIPT_READY = "transcript_ready"
    GEMINI_RESPONSE = "gemini_response"
    NEED_INFO = "need_info"
    NEED_CONFIRM = "need_confirm"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    FILE_COMPLAINT = "file_complaint"
    COMPLAINT_FILED = "complaint_filed"
    ESCALATE = "escalate"
    TRANSFER_REQUESTED = "transfer_requested"
    CALL_ENDED = "call_ended"
    ERROR_OCCURRED = "error_occurred"
    TIMEOUT = "timeout"
    RETRY = "retry"


@dataclass
class StateContext:
    """Context data passed between states."""
    session_id: str
    caller_number: str
    language: str = "hi"
    current_transcript: str = ""
    form_data: dict = field(default_factory=dict)
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    ticket_number: Optional[str] = None


class StateMachine:
    """
    State machine for managing call flow.
    
    Handles state transitions, callbacks, and error recovery.
    """
    
    def __init__(self, session_id: str, caller_number: str):
        self.state = CallState.IDLE
        self.context = StateContext(
            session_id=session_id,
            caller_number=caller_number
        )
        self.history: list[tuple[CallState, StateEvent]] = []
        self._callbacks: dict[CallState, Callable] = {}
        
        # Define valid transitions
        self.transitions = self._define_transitions()
    
    def _define_transitions(self) -> dict[tuple[CallState, StateEvent], CallState]:
        """Define valid state transitions."""
        return {
            # Initial flow
            (CallState.IDLE, StateEvent.CALL_STARTED): CallState.GREETING,
            (CallState.GREETING, StateEvent.GREETING_COMPLETE): CallState.LISTENING,
            
            # Main conversation loop
            (CallState.LISTENING, StateEvent.USER_SPOKE): CallState.PROCESSING,
            (CallState.PROCESSING, StateEvent.TRANSCRIPT_READY): CallState.PROCESSING,
            (CallState.PROCESSING, StateEvent.GEMINI_RESPONSE): CallState.PROCESSING,
            (CallState.PROCESSING, StateEvent.NEED_INFO): CallState.ASKING,
            (CallState.PROCESSING, StateEvent.NEED_CONFIRM): CallState.CONFIRMING,
            (CallState.PROCESSING, StateEvent.FILE_COMPLAINT): CallState.FILING,
            (CallState.PROCESSING, StateEvent.ESCALATE): CallState.ESCALATING,
            
            # Asking for information
            (CallState.ASKING, StateEvent.USER_SPOKE): CallState.PROCESSING,
            (CallState.ASKING, StateEvent.TIMEOUT): CallState.ASKING,  # Re-ask
            
            # Confirmation flow
            (CallState.CONFIRMING, StateEvent.CONFIRMED): CallState.FILING,
            (CallState.CONFIRMING, StateEvent.REJECTED): CallState.ASKING,
            (CallState.CONFIRMING, StateEvent.USER_SPOKE): CallState.PROCESSING,
            
            # Filing
            (CallState.FILING, StateEvent.COMPLAINT_FILED): CallState.ENDING,
            (CallState.FILING, StateEvent.ERROR_OCCURRED): CallState.ERROR,
            
            # Escalation
            (CallState.ESCALATING, StateEvent.TRANSFER_REQUESTED): CallState.TRANSFERRING,
            (CallState.TRANSFERRING, StateEvent.CALL_ENDED): CallState.IDLE,
            
            # Ending
            (CallState.ENDING, StateEvent.CALL_ENDED): CallState.IDLE,
            
            # Error handling
            (CallState.ERROR, StateEvent.RETRY): CallState.PROCESSING,
            (CallState.ERROR, StateEvent.ESCALATE): CallState.ESCALATING,
            (CallState.ERROR, StateEvent.CALL_ENDED): CallState.IDLE,
            
            # Timeout handling (can occur in multiple states)
            (CallState.LISTENING, StateEvent.TIMEOUT): CallState.ASKING,
            (CallState.CONFIRMING, StateEvent.TIMEOUT): CallState.ASKING,
        }
    
    def can_transition(self, event: StateEvent) -> bool:
        """Check if a transition is valid for the given event."""
        return (self.state, event) in self.transitions
    
    def transition(self, event: StateEvent) -> CallState:
        """
        Attempt to transition to a new state based on an event.
        
        Raises ValueError if the transition is not valid.
        """
        if not self.can_transition(event):
            raise ValueError(
                f"Invalid transition: {self.state} + {event}"
            )
        
        old_state = self.state
        self.state = self.transitions[(self.state, event)]
        self.history.append((old_state, event))
        
        # Execute callback if registered
        if self.state in self._callbacks:
            self._callbacks[self.state](self.context)
        
        return self.state
    
    def register_callback(self, state: CallState, callback: Callable[[StateContext], Any]):
        """Register a callback to be executed when entering a state."""
        self._callbacks[state] = callback
    
    def should_retry(self) -> bool:
        """Check if we should retry after an error."""
        return self.context.retry_count < self.context.max_retries
    
    def increment_retry(self):
        """Increment the retry counter."""
        self.context.retry_count += 1
    
    def reset_retry(self):
        """Reset the retry counter."""
        self.context.retry_count = 0
    
    def get_state_duration(self) -> int:
        """Get the number of transitions since entering current state."""
        count = 0
        for state, _ in reversed(self.history):
            if state == self.state:
                count += 1
            else:
                break
        return count
    
    def to_dict(self) -> dict:
        """Serialize state machine to dictionary."""
        return {
            "state": self.state.value,
            "session_id": self.context.session_id,
            "caller_number": self.context.caller_number,
            "language": self.context.language,
            "form_data": self.context.form_data,
            "retry_count": self.context.retry_count,
            "history_length": len(self.history)
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "StateMachine":
        """Deserialize state machine from dictionary."""
        sm = cls(data["session_id"], data["caller_number"])
        sm.state = CallState(data["state"])
        sm.context.language = data["language"]
        sm.context.form_data = data["form_data"]
        sm.context.retry_count = data["retry_count"]
        return sm


# Factory function for creating state machines
def create_state_machine(session_id: str, caller_number: str) -> StateMachine:
    """Create a new state machine for a call session."""
    return StateMachine(session_id, caller_number)
