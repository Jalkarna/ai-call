"""
Sarvam AI Text-to-Speech Client (Using Official SDK - CORRECTED)

Real-time speech synthesis using Sarvam AI's official Python SDK.
Following official documentation exactly.
Outputs µ-law audio for Twilio Media Streams.
"""

import os
import asyncio
from typing import Optional, Dict
from dataclasses import dataclass
from enum import Enum
import hashlib
import base64
import audioop
import io

import structlog
from sarvamai import AsyncSarvamAI

logger = structlog.get_logger()


class Language(str, Enum):
    """Supported languages for TTS."""
    HINDI = "hi-IN"
    GUJARATI = "gu-IN"
    ENGLISH = "en-IN"


class Voice(str, Enum):
    """Available voices."""
    # Valid speakers from Sarvam API
    ANUSHKA = "anushka"
    ABHILASH = "abhilash"
    MANISHA = "manisha"
    VIDYA = "vidya"
    ARYA = "arya"
    KARUN = "karun"
    HITESH = "hitesh"
    ADITYA = "aditya"
    PRIYA = "priya"
    NEHA = "neha"
    RAHUL = "rahul"


@dataclass
class TTSResult:
    """Result from TTS synthesis."""
    audio_data: bytes  # µ-law audio for Twilio
    duration_ms: int = 0
    sample_rate: int = 8000


def pcm_to_ulaw(pcm_data: bytes) -> bytes:
    """Convert 16-bit PCM to µ-law."""
    return audioop.lin2ulaw(pcm_data, 2)


def resample_audio(audio_data: bytes, from_rate: int, to_rate: int) -> bytes:
    """Resample audio from one sample rate to another."""
    if from_rate == to_rate:
        return audio_data
    # audioop.ratecv expects (fragment, width, nchannels, inrate, outrate, state)
    resampled, _ = audioop.ratecv(audio_data, 2, 1, from_rate, to_rate, None)
    return resampled


class SarvamTTSClient:
    """
    Sarvam AI Text-to-Speech client using official SDK.
    Outputs µ-law audio at 8kHz for Twilio Media Streams.
    """
    
    def __init__(self):
        """Initialize Sarvam TTS client."""
        self.api_key = os.getenv("SARVAM_API_KEY")
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY not found in environment variables")
        
        self.client = AsyncSarvamAI(api_subscription_key=self.api_key)
        
        # Default configuration
        self.default_language = Language.HINDI
        self.default_voice = Voice.ANUSHKA
        
        # Audio cache for common phrases
        self.audio_cache: Dict[str, bytes] = {}
        self.cache_max_size = 100
        
        logger.info("sarvam_tts_client_initialized")
    
    def _get_cache_key(self, text: str, language: Language, voice: Voice) -> str:
        """Generate cache key for audio."""
        content = f"{text}_{language}_{voice}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _get_voice_for_language(self, language: Language) -> Voice:
        """Get default voice for language."""
        voice_map = {
            Language.HINDI: Voice.ANUSHKA,
            Language.GUJARATI: Voice.MANISHA,
            Language.ENGLISH: Voice.ANUSHKA
        }
        return voice_map.get(language, Voice.ANUSHKA)
    
    def _convert_to_ulaw(self, audio_data: bytes, source_sample_rate: int = 8000) -> bytes:
        """
        Convert audio to µ-law format for Twilio.
        
        Twilio expects: µ-law, 8kHz, mono
        """
        try:
            # If source is not 8kHz, resample first
            if source_sample_rate != 8000:
                audio_data = resample_audio(audio_data, source_sample_rate, 8000)
            
            # Convert PCM to µ-law
            ulaw_audio = pcm_to_ulaw(audio_data)
            return ulaw_audio
            
        except Exception as e:
            logger.error("audio_conversion_error", error=str(e))
            # Return silence as fallback
            return b'\xff' * 8000  # 1 second of µ-law silence
    
    async def synthesize(
        self,
        text: str,
        language: Language = Language.HINDI,
        voice: Optional[Voice] = None,
        pitch: float = 0.0,
        pace: float = 1.0,
        use_cache: bool = True
    ) -> TTSResult:
        """
        Synthesize speech from text using batch API.
        Returns µ-law audio for Twilio playback.
        
        Args:
            text: Text to synthesize
            language: Target language
            voice: Voice to use (auto-selected if None)
            pitch: Pitch adjustment (-1.0 to 1.0)
            pace: Speech rate (0.5 to 2.0)
            use_cache: Whether to use cached audio
        
        Returns:
            TTSResult with µ-law audio data
        """
        try:
            # Auto-select voice if not specified
            if voice is None:
                voice = self._get_voice_for_language(language)
            
            # Check cache
            cache_key = self._get_cache_key(text, language, voice)
            if use_cache and cache_key in self.audio_cache:
                logger.info("✅ TTS cache hit", text_length=len(text))
                return TTSResult(audio_data=self.audio_cache[cache_key])
            
            logger.info("📤 Calling Sarvam TTS API", 
                       text_to_speak=text, 
                       language=language.value, 
                       voice=voice.value,
                       model="bulbul:v2")
            
            # Use batch TTS API (more reliable than streaming)
            response = await self.client.text_to_speech.convert(
                text=text,
                target_language_code=language.value,
                speaker=voice.value,
                pitch=pitch,
                pace=pace,
                loudness=1.5,
                speech_sample_rate=8000,  # 8kHz for telephony
                output_audio_codec="mulaw",  # µ-law for Twilio
                model="bulbul:v2",
                enable_preprocessing=True
            )
            
            # Extract audio from response
            if response and hasattr(response, 'audios') and response.audios:
                ulaw_audio = base64.b64decode(response.audios[0])
                
                # Cache if small enough
                if use_cache and len(self.audio_cache) < self.cache_max_size:
                    self.audio_cache[cache_key] = ulaw_audio
                
                logger.info("📥 Sarvam TTS response", 
                           audio_size_bytes=len(ulaw_audio),
                           format="mulaw_8khz")
                
                return TTSResult(
                    audio_data=ulaw_audio,
                    sample_rate=8000
                )
            else:
                logger.warning("⚠️ TTS: No audio in response")
                # Return µ-law silence as fallback
                return TTSResult(audio_data=b'\xff' * 8000)
                
        except Exception as e:
            logger.error("tts_synthesis_error", error=str(e), text=text[:50])
            # Return µ-law silence as fallback
            return TTSResult(audio_data=b'\xff' * 8000)
    
    def get_predefined_response(self, response_type: str, language: Language = Language.HINDI) -> str:
        """Get predefined response text."""
        responses = {
            Language.HINDI: {
                "greeting": "नमस्ते। वडोदरा नगर निगम में आपका स्वागत है।",
                "ask_name": "कृपया अपना नाम बताएं।",
                "ask_address": "आपका पता क्या है?",
                "ask_phone": "आपका मोबाइल नंबर क्या है?",
                "confirm": "क्या यह जानकारी सही है?",
                "success": "आपकी शिकायत दर्ज हो गई है।",
                "error": "क्षमा करें, कोई त्रुटि हुई है।",
                "goodbye": "धन्यवाद। आपका दिन शुभ हो।"
            },
            Language.GUJARATI: {
                "greeting": "નમસ્તે। વડોદરા મ્યુનિસિપલ કોર્પોરેશનમાં તમારું સ્વાગત છે।",
                "ask_name": "કૃપા કરીને તમારું નામ જણાવો।",
                "ask_address": "તમારું સરનામું શું છે?",
                "ask_phone": "તમારો મોબાઇલ નંબર શું છે?",
                "confirm": "શું આ માહિતી સાચી છે?",
                "success": "તમારી ફરિયાદ નોંધાઈ છે।",
                "error": "માફ કરશો, કોઈ ભૂલ થઈ છે।",
                "goodbye": "આભાર। તમારો દિવસ શુભ રહે।"
            },
            Language.ENGLISH: {
                "greeting": "Hello. Welcome to Vadodara Municipal Corporation.",
                "ask_name": "Please tell me your name.",
                "ask_address": "What is your address?",
                "ask_phone": "What is your mobile number?",
                "confirm": "Is this information correct?",
                "success": "Your complaint has been registered.",
                "error": "Sorry, an error occurred.",
                "goodbye": "Thank you. Have a good day."
            }
        }
        
        return responses.get(language, {}).get(response_type, "")


# Singleton instance
_sarvam_tts_client: Optional[SarvamTTSClient] = None

def get_sarvam_tts_client() -> SarvamTTSClient:
    """Get or create the singleton Sarvam TTS client."""
    global _sarvam_tts_client
    if _sarvam_tts_client is None:
        _sarvam_tts_client = SarvamTTSClient()
    return _sarvam_tts_client
