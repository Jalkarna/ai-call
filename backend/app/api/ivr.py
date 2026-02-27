"""
IVR Language Selection Handler for Twilio
"""

from fastapi import APIRouter, Request
from fastapi.responses import Response
import structlog
import os

logger = structlog.get_logger()

router = APIRouter()

# Language mapping: Digit -> Language Code
LANGUAGE_MAP = {
    "1": "gu",  # Gujarati
    "2": "hi",  # Hindi  
    "3": "en",  # English
}

# Language confirmation messages
CONFIRMATION_MESSAGES = {
    "gu": "આભાર. કૃપા કરીને રાહ જુઓ.",  # Thank you. Please wait.
    "hi": "धन्यवाद। कृपया प्रतीक्षा करें।",  # Thank you. Please wait.
    "en": "Thank you. Please wait.",
}


@router.post("/language-selection")
async def handle_language_selection(request: Request):
    """
    Handle IVR language selection from Twilio.
    
    Called when user presses 1/2/3 to select language.
    Redirects to media stream WebSocket with selected language.
    """
    try:
        # Parse Twilio POST data
        form_data = await request.form()
        digit_pressed = form_data.get("Digits", "2")  # Default to Hindi if no input
        caller_number = form_data.get("From", "Unknown")
        call_sid = form_data.get("CallSid", "Unknown")
        
        # Map digit to language
        language = LANGUAGE_MAP.get(digit_pressed, "hi")
        confirmation = CONFIRMATION_MESSAGES.get(language, CONFIRMATION_MESSAGES["hi"])
        
        logger.info(
            "ivr_language_selected",
            caller=caller_number,
            call_sid=call_sid,
            digit=digit_pressed,
            language=language
        )
        
        # Get WebSocket URL from environment
        stream_url = os.getenv("TWILIO_STREAM_URL", "wss://gerri-aeromedical-joanna.ngrok-free.dev/api/calls/stream")
        
        # Generate session ID from call SID
        session_id = f"call_{call_sid[-12:]}" if call_sid != "Unknown" else "call_unknown"
        
        # Build complete WebSocket URL with session_id and language
        stream_url_with_session = f"{stream_url}/{session_id}?lang={language}"
        
        logger.info("generating_twiml_response", 
                   session_id=session_id,
                   language=language,
                   stream_url=stream_url_with_session)
        
        # Generate TwiML response
        # Note: Twilio <Say> only supports limited languages (not Gujarati)
        # So we skip <Say> and connect directly - AI greeting will handle language
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{stream_url_with_session}">
            <Parameter name="language" value="{language}" />
            <Parameter name="caller" value="{caller_number}" />
        </Stream>
    </Connect>
</Response>'''
        
        return Response(content=twiml, media_type="application/xml")
        
    except Exception as e:
        logger.error("ivr_language_selection_error", error=str(e))
        
        # Fallback to Hindi on error
        fallback_url = os.getenv("TWILIO_STREAM_URL", "wss://gerri-aeromedical-joanna.ngrok-free.dev/api/calls/stream")
        fallback_twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="woman" language="hi-IN">धन्यवाद। कृपया प्रतीक्षा करें।</Say>
    <Connect>
        <Stream url="{fallback_url}?lang=hi">
            <Parameter name="language" value="hi" />
        </Stream>
    </Connect>
</Response>'''
        
        return Response(content=fallback_twiml, media_type="application/xml")


@router.get("/test")
async def test_ivr():
    """Test endpoint to verify IVR router is working."""
    return {
        "status": "ok",
        "message": "IVR router is active",
        "language_options": LANGUAGE_MAP
    }
