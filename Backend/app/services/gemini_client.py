"""
Gemini AI Client Service

Handles structured data extraction using Gemini 3.0 Flash with:
- Intent classification
- Field extraction
- Confidence scoring
- Next action determination
"""

import os
import json
import asyncio
from typing import Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from pydantic import BaseModel


class Intent(str, Enum):
    """Classified call intents."""
    COMPLAINT = "complaint"
    STATUS_CHECK = "status_check"
    GENERAL_INQUIRY = "general_inquiry"
    EMERGENCY = "emergency"
    UNKNOWN = "unknown"


class ComplaintType(str, Enum):
    """Types of complaints that can be filed."""
    GARBAGE_COLLECTION = "garbage_collection"
    MISSED_COLLECTION = "missed_collection"
    STREETLIGHT = "streetlight"
    WATER_SUPPLY = "water_supply"
    DRAINAGE = "drainage"
    ROAD_REPAIR = "road_repair"
    STRAY_ANIMAL = "stray_animal"
    ILLEGAL_ENCROACHMENT = "encroachment"
    OTHER = "other"


class NextAction(str, Enum):
    """Next action to take in conversation."""
    ASK = "ask"       # Ask for missing information
    CONFIRM = "confirm"  # Confirm extracted data
    FILE = "file"     # File the complaint
    ESCALATE = "escalate"  # Escalate to human
    END = "end"       # End the conversation


class GeminiResponse(BaseModel):
    """Structured response from Gemini."""
    intent: Intent
    complaint_type: Optional[ComplaintType] = None
    fields: dict = {}
    missing_fields: list[str] = []
    confidence: dict[str, float] = {}
    next_action: NextAction
    speak: str


@dataclass
class ConversationHistory:
    """Conversation history for context."""
    session_id: str
    turns: list[dict] = field(default_factory=list)
    current_form: dict = field(default_factory=dict)
    
    def add_turn(self, role: str, content: str):
        self.turns.append({"role": role, "content": content})
    
    def update_form(self, fields: dict):
        self.current_form.update(fields)


class GeminiClient:
    """
    Client for Gemini 3.0 Flash API.
    
    Handles structured data extraction and conversation management.
    """
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.model = "gemini-3.0-flash"
        self.system_prompt = self._load_system_prompt()
        self.schema = self._load_json_schema()
    
    def _load_system_prompt(self) -> str:
        """Load the system prompt for Gemini."""
        prompt_path = os.path.join(
            os.path.dirname(__file__), 
            "..", "schemas", "gemini_system_prompt.txt"
        )
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return self._get_default_system_prompt()
    
    def _get_default_system_prompt(self) -> str:
        """Default system prompt if file not found."""
        return """You are an AI assistant for Vadodara Municipal Corporation (VMC).
Your role is to:
1. Understand citizen complaints and inquiries in Hindi, Gujarati, or English
2. Extract structured information from conversations
3. Guide citizens through the complaint registration process
4. Be polite, helpful, and efficient

Always respond in JSON format with the following structure:
- intent: The classified intent of the caller
- complaint_type: Type of complaint (if applicable)
- fields: Extracted structured data (address, contact_number, pincode, description)
- missing_fields: List of required fields that are still missing
- confidence: Confidence scores (0-1) for each extracted field
- next_action: What to do next (ask, confirm, file, escalate, end)
- speak: What to say to the caller (in their language)

Required fields for complaints: address, contact_number
Optional but recommended: pincode, landmark

If confidence for any critical field is below 0.7, ask for confirmation.
If the caller seems frustrated or requests a human, escalate immediately."""
    
    def _load_json_schema(self) -> dict:
        """Load the JSON schema for response validation."""
        return {
            "type": "object",
            "properties": {
                "intent": {"type": "string"},
                "complaint_type": {"type": "string"},
                "fields": {"type": "object"},
                "missing_fields": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "object"},
                "next_action": {"type": "string"},
                "speak": {"type": "string"}
            },
            "required": ["intent", "fields", "next_action", "speak"]
        }
    
    async def process(
        self,
        transcript: str,
        history: ConversationHistory,
        language: str = "hi"
    ) -> GeminiResponse:
        """
        Process a transcript and return structured extraction.
        
        Args:
            transcript: The user's speech transcript
            history: Conversation history with current form state
            language: Detected language of the caller
        
        Returns:
            GeminiResponse with extracted data and next action
        """
        # Add the new transcript to history
        history.add_turn("user", transcript)
        
        # Build the prompt
        prompt = self._build_prompt(history, language)
        
        # TODO: Implement actual Gemini API call
        # Placeholder implementation
        
        response = GeminiResponse(
            intent=Intent.UNKNOWN,
            next_action=NextAction.ASK,
            speak="Could you please repeat that?"
        )
        
        # Add AI response to history
        history.add_turn("assistant", response.speak)
        
        return response
    
    def _build_prompt(self, history: ConversationHistory, language: str) -> dict:
        """Build the prompt payload for Gemini API."""
        return {
            "model": self.model,
            "system": self.system_prompt,
            "input": {
                "session_id": history.session_id,
                "history": history.turns,
                "current_form": history.current_form,
                "language": language
            },
            "response_format": {
                "type": "json_schema",
                "schema": self.schema
            }
        }
    
    def validate_response(self, response: dict) -> bool:
        """Validate response against JSON schema."""
        required_fields = ["intent", "fields", "next_action", "speak"]
        return all(field in response for field in required_fields)


# Singleton instance
gemini_client = GeminiClient()
