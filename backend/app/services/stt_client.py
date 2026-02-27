"""
Sarvam AI Speech-to-Text Client (Using Official SDK)

Real-time audio transcription using Sarvam AI's official Python SDK.
Supports both streaming (with VAD) and batch transcription.
"""

import os
import asyncio
import io
import wave
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass, field
import base64
import audioop

import structlog
from sarvamai import AsyncSarvamAI

logger = structlog.get_logger()


@dataclass
class TranscriptResult:
    """Result from transcription."""
    text: str
    is_final: bool
    confidence: float = 1.0
    language: str = "hi"
    event_type: str = "transcript"  # transcript, speech_start, speech_end


class AudioBuffer:
    """
    Buffer for collecting audio chunks with silence detection.
    
    Implements simple VAD by tracking audio energy levels.
    """
    
    def __init__(
        self, 
        min_audio_ms: int = 600,       # Minimum audio before processing (600ms)
        max_audio_ms: int = 15000,     # Maximum audio to buffer (15 seconds)
        silence_threshold_ms: int = 1000,  # Silence duration to trigger end of speech (1.0s)
        sample_rate: int = 8000
    ):
        self.min_audio_ms = min_audio_ms
        self.max_audio_ms = max_audio_ms
        self.silence_threshold_ms = silence_threshold_ms
        self.sample_rate = sample_rate
        
        self.buffer = bytearray()
        self.silence_samples = 0
        self.speech_started = False
        self.last_energy = 0
        self.chunk_count = 0  # For debug logging
        self.energy_history = []  # Track recent energy levels
        self.energy_history_size = 50  # Keep last 50 chunks (~1 second)
        
        # Calculate byte thresholds (µ-law is 1 byte per sample)
        self.min_bytes = int((sample_rate * min_audio_ms) / 1000)
        self.max_bytes = int((sample_rate * max_audio_ms) / 1000)
        self.silence_bytes = int((sample_rate * silence_threshold_ms) / 1000)
        
        # Energy threshold for speech detection (µ-law specific)
        # Using relative threshold instead of absolute for better noise handling
        self.energy_threshold = 5  # Minimum absolute threshold
        self.silence_drop_ratio = 0.7  # Energy must drop to 70% of average to be considered silence
    
    def _calculate_energy(self, audio_data: bytes) -> float:
        """Calculate audio energy level for VAD."""
        if not audio_data:
            return 0
        # For µ-law, calculate RMS-like energy
        # µ-law values: 0xff is silence, lower values are louder
        total = sum(255 - b for b in audio_data)
        return total / len(audio_data)
    
    def add_audio(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Add audio data to buffer and check for speech events.
        
        Returns:
            Dict with 'event' key: None, 'speech_start', 'speech_end', or 'ready'
        """
        energy = self._calculate_energy(audio_data)
        self.last_energy = energy
        
        # Track energy history for relative threshold
        self.energy_history.append(energy)
        if len(self.energy_history) > self.energy_history_size:
            self.energy_history.pop(0)
        
        result = {'event': None, 'energy': energy}
        
        # Calculate average recent energy (for relative silence detection)
        avg_energy = sum(self.energy_history) / len(self.energy_history) if self.energy_history else energy
        silence_threshold = avg_energy * self.silence_drop_ratio
        
        # Detect speech start (energy above threshold)
        if not self.speech_started and energy > max(self.energy_threshold, silence_threshold):
            self.speech_started = True
            self.silence_samples = 0
            result['event'] = 'speech_start'
            logger.debug("vad_speech_start", energy=energy, avg_energy=avg_energy)
        
        # Add to buffer
        self.buffer.extend(audio_data)
        self.chunk_count += 1
        
        # Periodic debug logging (every 50 chunks = ~1 second at 20ms chunks)
        if self.chunk_count % 50 == 0 and self.speech_started:
            silence_ms = self.silence_samples * 1000 / 8000
            print(f"🔊 VAD: energy={energy:.2f}, silence_thresh={silence_threshold:.2f}, silence={silence_ms:.0f}ms, buffer={len(self.buffer)} bytes")
        
        if self.speech_started:
            # Track silence using relative threshold
            if energy <= silence_threshold:
                self.silence_samples += len(audio_data)
            else:
                self.silence_samples = 0
            
            # Check for end of speech (silence threshold reached)
            if self.silence_samples >= self.silence_bytes and len(self.buffer) >= self.min_bytes:
                result['event'] = 'speech_end'
                print(f"🛑 VAD: Speech END detected, silence_ms={self.silence_samples*1000/8000:.0f}ms, buffer={len(self.buffer)} bytes")
                logger.debug("vad_speech_end", buffer_size=len(self.buffer), silence=self.silence_samples)
            
            # Check for max buffer (force processing)
            elif len(self.buffer) >= self.max_bytes:
                result['event'] = 'ready'
                print(f"⚠️ VAD: MAX BUFFER reached ({len(self.buffer)} bytes) - forcing processing (speech may have been too long or silence not detected)")
                logger.debug("vad_max_buffer", buffer_size=len(self.buffer))
        
        return result
    
    def get_audio(self) -> Optional[bytes]:
        """Get all buffered audio and reset."""
        if len(self.buffer) >= self.min_bytes:
            audio = bytes(self.buffer)
            self.clear()
            return audio
        return None
    
    def has_significant_audio(self) -> bool:
        """Check if buffer has enough audio to be meaningful (for interrupt detection)."""
        return len(self.buffer) >= self.min_bytes and self.speech_started
    
    def clear(self):
        """Clear the buffer and reset state."""
        self.buffer.clear()
        self.silence_samples = 0
        self.speech_started = False
        self.chunk_count = 0


def ulaw_to_pcm(ulaw_data: bytes) -> bytes:
    """Convert µ-law to 16-bit PCM."""
    return audioop.ulaw2lin(ulaw_data, 2)


def pcm_to_ulaw(pcm_data: bytes) -> bytes:
    """Convert 16-bit PCM to µ-law."""
    return audioop.lin2ulaw(pcm_data, 2)


def create_wav_from_pcm(pcm_data: bytes, sample_rate: int = 8000, channels: int = 1) -> bytes:
    """Create a WAV file from raw PCM data."""
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return wav_buffer.getvalue()


@dataclass
class CallAudioState:
    """Tracks audio state for a call session."""
    is_speaking: bool = False          # Is the AI currently speaking?
    is_processing: bool = False        # Is a request being processed?
    pending_interrupt: bool = False    # Is there a pending interrupt?
    last_transcript: str = ""          # Last processed transcript


class SarvamSTTClient:
    """
    Sarvam AI Speech-to-Text client using official SDK.
    """
    
    def __init__(self):
        """Initialize Sarvam STT client."""
        self.api_key = os.getenv("SARVAM_API_KEY")
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY not found in environment variables")
        
        self.client = AsyncSarvamAI(api_subscription_key=self.api_key)
        self.socket = None
        self._context_manager = None
        self.is_connected = False
        
        logger.info("sarvam_stt_client_initialized")
    
    async def transcribe_batch(
        self,
        audio_data: bytes,
        language: str = "hi"
    ) -> Optional[TranscriptResult]:
        """
        Transcribe audio using batch API (simpler and more reliable).
        
        Args:
            audio_data: Raw PCM audio bytes (16-bit, 8kHz)
            language: Language code (hi, gu, en)
        
        Returns:
            TranscriptResult with transcription
        """
        try:
            # Create WAV file from PCM
            wav_data = create_wav_from_pcm(audio_data, sample_rate=8000)
            
            # Map language code
            lang_map = {
                "hi": "hi-IN",
                "gu": "gu-IN", 
                "en": "en-IN"
            }
            language_code = lang_map.get(language, "hi-IN")
            
            logger.info("📤 Calling Sarvam STT API", 
                       language=language_code, 
                       audio_size_bytes=len(wav_data),
                       model="saarika:v2.5")
            
            # Use batch transcription API with file-like object
            response = await self.client.speech_to_text.transcribe(
                file=wav_data,  # Pass bytes directly
                language_code=language_code,
                model="saarika:v2.5"
            )
            
            if response and hasattr(response, 'transcript'):
                text = response.transcript.strip() if response.transcript else ""
                logger.info("📥 Sarvam STT response", 
                           transcript=text if text else "(empty)",
                           has_text=bool(text))
                
                if text:  # Only return if we got actual text
                    return TranscriptResult(
                        text=text,
                        is_final=True,
                        confidence=0.9,
                        language=language
                    )
            else:
                logger.warning("⚠️ STT: No response or transcript attribute")
            
            return None
            
        except Exception as e:
            logger.error("❌ STT batch error", error=str(e))
            return None
    
    async def close(self):
        """Close any open connections."""
        try:
            if self._context_manager:
                await self._context_manager.__aexit__(None, None, None)
                logger.info("sarvam_stt_disconnected")
        except Exception as e:
            logger.error("sarvam_stt_close_error", error=str(e))
        finally:
            self.socket = None
            self._context_manager = None
            self.is_connected = False


# Singleton instance
_sarvam_stt_client: Optional[SarvamSTTClient] = None

def get_sarvam_stt_client() -> SarvamSTTClient:
    """Get or create the singleton Sarvam STT client."""
    global _sarvam_stt_client
    if _sarvam_stt_client is None:
        _sarvam_stt_client = SarvamSTTClient()
    return _sarvam_stt_client
