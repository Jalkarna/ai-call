"""
Gemini AI Client Service

Handles structured data extraction using Gemini 3 Flash with:
- Intent classification
- Field extraction with confidence scoring
- Next action determination
- Multi-language support (Hindi, Gujarati, English)
- Proper conversation context using Gemini's built-in history
- Structured outputs using Pydantic models
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path

from google import genai
from google.genai import types
from pydantic import BaseModel, Field as PydanticField
import structlog

logger = structlog.get_logger()


class Intent(str, Enum):
    """Classified call intents."""
    COMPLAINT = "complaint"
    STATUS_CHECK = "status_check"
    GENERAL_INQUIRY = "general_inquiry"
    EMERGENCY = "emergency"
    UNKNOWN = "unknown"


class ComplaintType(str, Enum):
    """Types of complaints."""
    GARBAGE_COLLECTION = "garbage_collection"
    MISSED_COLLECTION = "missed_collection"
    STREETLIGHT = "streetlight"
    WATER_SUPPLY = "water_supply"
    DRAINAGE = "drainage"
    ROAD_REPAIR = "road_repair"
    STRAY_ANIMAL = "stray_animal"
    ENCROACHMENT = "encroachment"
    OTHER = "other"


class NextAction(str, Enum):
    """Next action in conversation."""
    ASK = "ask"
    CONFIRM = "confirm"
    FILE = "file"
    ESCALATE = "escalate"
    END = "end"


# Pydantic models for structured output
class ExtractedFields(BaseModel):
    """Extracted complaint fields."""
    address: Optional[str] = PydanticField(None, description="Full address of the complaint location")
    locality: Optional[str] = PydanticField(None, description="Locality or area name")
    pincode: Optional[str] = PydanticField(None, description="PIN code")
    contact_number: Optional[str] = PydanticField(None, description="Contact phone number")
    landmark: Optional[str] = PydanticField(None, description="Nearby landmark")
    description: Optional[str] = PydanticField(None, description="Complaint description")


class FieldConfidence(BaseModel):
    """Confidence scores for extracted fields."""
    address: Optional[float] = PydanticField(None, description="Confidence for address (0-1)")
    locality: Optional[float] = PydanticField(None, description="Confidence for locality (0-1)")
    pincode: Optional[float] = PydanticField(None, description="Confidence for pincode (0-1)")
    contact_number: Optional[float] = PydanticField(None, description="Confidence for contact (0-1)")
    landmark: Optional[float] = PydanticField(None, description="Confidence for landmark (0-1)")
    description: Optional[float] = PydanticField(None, description="Confidence for description (0-1)")


class GeminiStructuredResponse(BaseModel):
    """Structured response from Gemini using Pydantic."""
    intent: Intent = PydanticField(description="Classified intent of the call")
    complaint_type: Optional[ComplaintType] = PydanticField(None, description="Type of complaint if applicable")
    fields: ExtractedFields = PydanticField(default_factory=ExtractedFields, description="Extracted complaint fields")
    missing_fields: List[str] = PydanticField(default_factory=list, description="List of missing required fields")
    confidence: FieldConfidence = PydanticField(default_factory=FieldConfidence, description="Confidence scores for fields")
    next_action: NextAction = PydanticField(description="Next action to take in conversation")
    speak: str = PydanticField(description="Text to speak to the user (max 25 words)")


@dataclass
class GeminiResponse:
    """Structured response from Gemini."""
    intent: Intent
    complaint_type: Optional[ComplaintType] = None
    fields: Dict[str, Any] = field(default_factory=dict)
    missing_fields: List[str] = field(default_factory=list)
    confidence: Dict[str, float] = field(default_factory=dict)
    next_action: NextAction = NextAction.ASK
    speak: str = ""


@dataclass
class ConversationHistory:
    """Conversation history for context."""
    session_id: str
    turns: List[Dict[str, str]] = field(default_factory=list)
    current_form: Dict[str, Any] = field(default_factory=dict)
    language: str = "hi"
    
    def add_turn(self, role: str, content: str):
        """Add a conversation turn."""
        self.turns.append({"role": role, "text": content})
    
    def update_form(self, fields: Dict[str, Any]):
        """Update the current form with new fields."""
        self.current_form.update(fields)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "session_id": self.session_id,
            "history": self.turns,
            "current_form": self.current_form,
            "language": self.language
        }


class GeminiClient:
    """
    Client for Gemini 3 Flash API with structured outputs.
    
    Handles complaint extraction and conversation management.
    """
    
    def __init__(self):
        """Initialize Gemini client."""
        # Standardized environment variable with fallback
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Use Gemini 3 Flash Preview
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
        
        # Initialize Google GenAI client
        self.client = genai.Client(api_key=self.api_key)
        
        # Load system prompt
        self.system_prompt = self._load_system_prompt()
        
        # Define function declarations for Gemini function calling
        self.end_call_function = {
            "name": "end_call",
            "description": """STRICT RULES - Only call end_call when ALL conditions are met:
            1. Complaint has been FILED (you said 'शिकायत दर्ज हो गई' or equivalent)
            2. You ALREADY ASKED 'क्या कुछ और मदद चाहिए?' in a PREVIOUS turn  
            3. User replied 'नहीं', 'no', 'बस', 'nothing else' to your 'more help?' question
            
            NEVER call end_call:
            - Immediately after user confirms ('हाँ', 'कर दो') - you must ASK 'और मदद?' first
            - In the same turn as filing complaint
            - Before asking if they need more help
            
            The flow is: confirm -> file -> ask 'और मदद?' -> wait for user 'no' -> THEN end_call""",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Why call is ending - must include that user said 'no more help'"
                    }
                },
                "required": ["reason"]
            }
        }
        
        logger.info("gemini_client_initialized", model=self.model_name)
    
    def _load_system_prompt(self) -> str:
        """Load the system prompt from file."""
        prompt_path = Path(__file__).parent.parent / "schemas" / "gemini_system_prompt.txt"
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("system_prompt_file_not_found", path=str(prompt_path))
            return self._get_default_system_prompt()
    
    def _get_default_system_prompt(self) -> str:
        """Fallback system prompt."""
        return """You are a female AI assistant for VMC. Extract structured data from conversations.
IMPORTANT: You are FEMALE - use appropriate pronouns."""
    
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
            language: Detected language (hi/gu/en)
        
        Returns:
            GeminiResponse with extracted data and next action
        """
        # Update history
        history.language = language
        
        try:
            # Build the request - DON'T add user turn yet, it will be added after successful processing
            contents = self._build_contents(history, transcript)
            
            # Create tools with function declarations
            tools = types.Tool(function_declarations=[self.end_call_function])
            
            # Configure with structured output using Pydantic AND function calling
            config = types.GenerateContentConfig(
                system_instruction=self.system_prompt,
                response_mime_type="application/json",
                response_json_schema=GeminiStructuredResponse.model_json_schema(),
                tools=[tools],  # Add function calling tools
                temperature=1.0,  # Default for Gemini 3
                thinking_config=types.ThinkingConfig(
                    thinking_level="low"  # Low reasoning for Gemini 3 Flash (minimizes latency)
                )
            )
            
            # Call Gemini API
            print(f"📤 Calling Gemini API: model={self.model_name} turns={len(contents)} thinking=low function_calling=enabled")
            logger.info("📤 Calling Gemini API", 
                       session_id=history.session_id, 
                       model=self.model_name,
                       conversation_turns=len(contents),
                       thinking_level="low",
                       function_calling="enabled")
            
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model_name,
                contents=contents,
                config=config
            )
            
            # Check for function call first
            function_called = False
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            function_call = part.function_call
                            if function_call.name == "end_call":
                                print(f"📞 Gemini called end_call function: reason={function_call.args.get('reason', 'not specified')}")
                                logger.info("gemini_function_call_end_call",
                                           session_id=history.session_id,
                                           reason=function_call.args.get('reason', 'not specified'))
                                function_called = True
                                
                                # Try to get the farewell message from the JSON part of the response
                                farewell_text = None
                                try:
                                    # Look for JSON text in the response
                                    for part in candidate.content.parts:
                                        if hasattr(part, 'text') and part.text:
                                            import json
                                            try:
                                                json_data = json.loads(part.text)
                                                farewell_text = json_data.get('speak', '')
                                            except json.JSONDecodeError:
                                                pass
                                except Exception:
                                    pass
                                
                                # Fallback farewell if not found
                                if not farewell_text:
                                    farewell_text = {
                                        "hi": "VMC में call करने के लिए धन्यवाद। आपका दिन शुभ हो!",
                                        "gu": "VMC માં કૉલ કરવા બદલ આભાર. તમારો દિવસ શુભ રહે!",
                                        "en": "Thank you for calling VMC. Have a great day!"
                                    }.get(language, "VMC में call करने के लिए धन्यवाद। आपका दिन शुभ हो!")
                                
                                gemini_response = GeminiResponse(
                                    intent=Intent.COMPLAINT,
                                    next_action=NextAction.END,
                                    speak=farewell_text,
                                    fields=history.current_form,
                                    missing_fields=[]
                                )
                                
                                # Add to history
                                history.add_turn("user", transcript)
                                history.add_turn("assistant", gemini_response.speak)
                                
                                return gemini_response
            
            # Parse regular JSON response if no function call
            if not function_called:
                response_text = response.text
                print(f"📥 Gemini API response: {response_text[:300]}")
                logger.info("📥 Gemini API response received", 
                           session_id=history.session_id,
                           response_length=len(response_text),
                           raw_response=response_text[:500] if len(response_text) > 500 else response_text)
                
                # Parse and validate response
                gemini_response = self._parse_response(response_text, history)
                
                # NOW add turns to history after successful processing
                history.add_turn("user", transcript)
                history.add_turn("assistant", gemini_response.speak)
            
            # Update current form with extracted fields
            if gemini_response.fields:
                history.update_form(gemini_response.fields)
            
            logger.info(
                "gemini_response_processed",
                session_id=history.session_id,
                intent=gemini_response.intent,
                next_action=gemini_response.next_action,
                missing_fields=gemini_response.missing_fields
            )
            
            return gemini_response
            
        except Exception as e:
            logger.error("gemini_processing_error", error=str(e), session_id=history.session_id)
            # Return fallback response
            return self._create_fallback_response(language)
    
    def _build_contents(self, history: ConversationHistory, current_transcript: str) -> List[types.Content]:
        """Build contents for Gemini API request with proper conversation context."""
        # Build conversation turns from history (ONLY LAST 3 TURNS for performance)
        # 3 turns = 6 messages, enough context without slowing Gemini
        contents = []
        recent_turns = history.turns[-3:] if len(history.turns) > 3 else history.turns
        
        for turn in recent_turns:
            role = "user" if turn["role"] == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=turn["text"])]
                )
            )
        
        # Add current user message with context about current form state
        context_info = f"[Current form: {json.dumps(history.current_form, ensure_ascii=False)}]\n\n" if history.current_form else ""
        user_message = context_info + current_transcript
        
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=user_message)]
            )
        )
        
        return contents
    
    def _parse_response(self, response_text: str, history: ConversationHistory) -> GeminiResponse:
        """Parse and validate Gemini JSON response."""
        try:
            data = json.loads(response_text)
            
            # Extract fields - filter out None values
            raw_fields = data.get("fields", {})
            if isinstance(raw_fields, dict):
                fields = {k: v for k, v in raw_fields.items() if v is not None}
            else:
                fields = {}
            
            # Add complaint_type to fields if present
            if data.get("complaint_type"):
                fields["complaint_type"] = data.get("complaint_type")
            
            # Extract confidence - filter out None values
            raw_confidence = data.get("confidence", {})
            if isinstance(raw_confidence, dict):
                confidence = {k: v for k, v in raw_confidence.items() if v is not None}
            else:
                confidence = {}
            
            logger.info("gemini_fields_extracted", 
                       fields=fields, 
                       confidence=confidence,
                       missing_fields=data.get("missing_fields", []))
            
            return GeminiResponse(
                intent=Intent(data.get("intent", "unknown")),
                complaint_type=ComplaintType(data["complaint_type"]) if data.get("complaint_type") else None,
                fields=fields,
                missing_fields=data.get("missing_fields", []),
                confidence=confidence,
                next_action=NextAction(data.get("next_action", "ask")),
                speak=data.get("speak", "")
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error("gemini_response_parse_error", error=str(e), response=response_text[:200])
            return self._create_fallback_response(history.language)
    
    def _create_fallback_response(self, language: str = "hi") -> GeminiResponse:
        """Create a fallback response when Gemini fails."""
        fallback_messages = {
            "hi": "क्षमा करें, मैं आपको समझ नहीं पाया। कृपया दोबारा बताएं।",
            "gu": "માફ કરશો, હું તમને સમજી શક્યો નહીં. કૃપા કરીને ફરીથી કહો.",
            "en": "Sorry, I didn't understand. Please repeat."
        }
        
        return GeminiResponse(
            intent=Intent.UNKNOWN,
            next_action=NextAction.ASK,
            speak=fallback_messages.get(language, fallback_messages["hi"])
        )


# Singleton instance
_gemini_client: Optional[GeminiClient] = None

def get_gemini_client() -> GeminiClient:
    """Get or create the singleton Gemini client instance."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
