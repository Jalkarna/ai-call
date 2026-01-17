"""
Twilio Client Service

Handles Twilio API interactions for:
- Accepting incoming calls
- Managing media streams
- Playing TTS audio responses
"""

from typing import Optional
import os
import structlog

logger = structlog.get_logger()


class TwilioClient:
    """
    Client for Twilio Voice API operations.
    
    Manages incoming calls, media streams, and audio playback.
    """
    
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        self._client = None
    
    @property
    def client(self):
        """Lazy-load Twilio client to avoid import errors if not installed."""
        if self._client is None and self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
            except ImportError:
                logger.warning("twilio_sdk_not_installed")
        return self._client
    
    def get_call_duration(self, call_sid: str) -> Optional[int]:
        """
        Fetch call duration from Twilio API.
        
        Args:
            call_sid: The Twilio Call SID
            
        Returns:
            Duration in seconds, or None if fetch fails
        """
        if not self.client or not call_sid or call_sid.startswith("test_"):
            return None
        
        try:
            call = self.client.calls(call_sid).fetch()
            duration = int(call.duration) if call.duration else None
            logger.info("twilio_call_duration_fetched", call_sid=call_sid, duration=duration)
            return duration
        except Exception as e:
            logger.warning("twilio_call_duration_fetch_error", error=str(e), call_sid=call_sid)
            return None
    
    def end_call(self, call_sid: str) -> bool:
        """
        Terminate an active Twilio call.
        
        Args:
            call_sid: The Twilio Call SID
            
        Returns:
            True if successful, False otherwise
        """
        if not self.client or not call_sid or call_sid.startswith("test_"):
            logger.info("skip_twilio_end_call", call_sid=call_sid, reason="no client or test call")
            return False
        
        try:
            call = self.client.calls(call_sid).update(status="completed")
            logger.info("twilio_call_ended", call_sid=call_sid, status=call.status)
            return True
        except Exception as e:
            logger.warning("twilio_call_end_error", error=str(e), call_sid=call_sid)
            return False
    
    def generate_welcome_twiml(self, session_id: str, stream_url: str) -> str:
        """
        Generate TwiML for call start with consent announcement and stream setup.
        """
        return f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say voice="Polly.Aditi" language="hi-IN">
                नमस्ते। वडोदरा नगर निगम में आपका स्वागत है।
                यह कॉल रिकॉर्ड की जाएगी।
            </Say>
            <Start>
                <Stream url="{stream_url}" />
            </Start>
            <Pause length="300"/>
        </Response>
        """
    
    def generate_play_audio_twiml(self, audio_url: str) -> str:
        """
        Generate TwiML to play audio response to caller.
        """
        return f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Play>{audio_url}</Play>
        </Response>
        """
    
    def generate_gather_twiml(
        self, 
        prompt_url: str,
        action_url: str,
        timeout: int = 5,
        num_digits: Optional[int] = None
    ) -> str:
        """
        Generate TwiML for gathering DTMF input or speech.
        """
        gather_attrs = f'timeout="{timeout}" action="{action_url}"'
        if num_digits:
            gather_attrs += f' numDigits="{num_digits}"'
        
        return f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Gather {gather_attrs}>
                <Play>{prompt_url}</Play>
            </Gather>
        </Response>
        """
    
    def generate_transfer_twiml(self, operator_number: str) -> str:
        """
        Generate TwiML to transfer call to human operator.
        """
        return f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say>Transferring you to an operator. Please hold.</Say>
            <Dial>{operator_number}</Dial>
        </Response>
        """
    
    def generate_hangup_twiml(self, farewell_message: str = "Thank you for calling.") -> str:
        """
        Generate TwiML to end the call.
        """
        return f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say>{farewell_message}</Say>
            <Hangup/>
        </Response>
        """


# Singleton instance
twilio_client = TwilioClient()
