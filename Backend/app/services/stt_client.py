"""
Speech-to-Text Client Service

Handles audio transcription using OpenAI Whisper API with:
- Audio buffering
- Voice Activity Detection (VAD)
- Partial and final transcript generation
"""

import os
import io
import asyncio
from typing import Optional, Callable, AsyncGenerator
from dataclasses import dataclass
from enum import Enum


class TranscriptType(str, Enum):
    PARTIAL = "partial"
    FINAL = "final"


@dataclass
class TranscriptResult:
    """Result from STT processing."""
    text: str
    language: str
    confidence: float
    is_final: bool
    duration_ms: int


class STTClient:
    """
    Client for OpenAI Whisper API.
    
    Handles audio buffering, VAD detection, and transcription.
    """
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = "whisper-1"
        self.buffer = io.BytesIO()
        self.silence_threshold_ms = 1500  # 1.5 seconds of silence = end of utterance
        self.min_audio_length_ms = 500    # Minimum audio to process
    
    async def process_audio_chunk(
        self, 
        audio_data: bytes,
        on_partial: Optional[Callable[[str], None]] = None
    ) -> Optional[TranscriptResult]:
        """
        Process incoming audio chunk.
        
        Buffers audio and triggers transcription when VAD detects end of speech.
        Returns TranscriptResult when utterance is complete.
        """
        self.buffer.write(audio_data)
        
        # TODO: Implement VAD detection
        # For now, this is a placeholder that would detect silence
        
        return None
    
    async def transcribe(
        self,
        audio_data: bytes,
        language: Optional[str] = None
    ) -> TranscriptResult:
        """
        Transcribe audio using Whisper API.
        
        Args:
            audio_data: Raw audio bytes (WAV format expected)
            language: Optional language hint (e.g., "hi" for Hindi)
        
        Returns:
            TranscriptResult with transcribed text and metadata
        """
        # TODO: Implement actual Whisper API call
        # Placeholder implementation
        
        return TranscriptResult(
            text="",
            language=language or "hi",
            confidence=0.0,
            is_final=True,
            duration_ms=0
        )
    
    async def transcribe_stream(
        self,
        audio_stream: AsyncGenerator[bytes, None],
        language: Optional[str] = None
    ) -> AsyncGenerator[TranscriptResult, None]:
        """
        Stream audio and yield transcripts as they become available.
        
        Useful for real-time transcription with partial results.
        """
        async for chunk in audio_stream:
            result = await self.process_audio_chunk(chunk)
            if result:
                yield result
    
    def reset_buffer(self):
        """Reset the audio buffer for a new utterance."""
        self.buffer = io.BytesIO()
    
    def get_buffer_duration_ms(self) -> int:
        """Get the current buffer duration in milliseconds."""
        # Assuming 16kHz, 16-bit mono audio
        bytes_count = self.buffer.tell()
        samples = bytes_count // 2
        duration_ms = (samples / 16000) * 1000
        return int(duration_ms)


# Singleton instance
stt_client = STTClient()
