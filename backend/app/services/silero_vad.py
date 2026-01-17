"""
Silero VAD Implementation for Voice Activity Detection

Uses Silero VAD neural network for reliable speech detection.
CRITICAL: Silero requires EXACTLY 256 samples (32ms) for 8kHz audio.
"""

import torch
import numpy as np
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger()


class SileroVADBuffer:
    """
    Voice Activity Detection using Silero VAD neural network.
    
    Silero VAD requirements for 8kHz audio:
    - EXACTLY 256 samples per inference (32ms window)
    - We batch 8 windows = 256ms before checking for speech
    """
    
    def __init__(
        self,
        min_audio_ms: int = 600,
        max_audio_ms: int = 10000,
        silence_threshold_ms: int = 1200,
        sample_rate: int = 8000,
        vad_threshold: float = 0.6,       # Increased from 0.5 for fewer false positives
        hangover_ms: int = 300
    ):
        self.sample_rate = sample_rate
        self.vad_threshold = vad_threshold
        
        # Buffer
        self.buffer = bytearray()
        self.silence_samples = 0
        self.speech_started = False
        self.chunk_count = 0
        
        # Byte thresholds
        self.min_bytes = int((sample_rate * min_audio_ms) / 1000)
        self.max_bytes = int((sample_rate * max_audio_ms) / 1000)
        self.silence_bytes = int((sample_rate * silence_threshold_ms) / 1000)
        self.hangover_bytes = int((sample_rate * hangover_ms) / 1000)
        
        # Silero VAD window: EXACTLY 256 samples for 8kHz (512 for 16kHz)
        self.vad_window_samples = 512 if sample_rate == 16000 else 256
        self.vad_window_bytes = self.vad_window_samples  # 1 byte/sample in µ-law
        
        # Load Silero VAD model
        try:
            self.model, utils = torch.hub.load(
                repo_or_dir='snakers4/silero-vad',
                model='silero_vad',
                force_reload=False,
                onnx=False
            )
            logger.info("silero_vad_loaded", 
                       window_samples=self.vad_window_samples,
                       threshold=vad_threshold)
        except Exception as e:
            logger.error("silero_vad_load_failed", error=str(e))
            raise RuntimeError(f"Failed to load Silero VAD: {e}")
    
    def _ulaw_to_pcm_int16(self, ulaw_data: bytes) -> np.ndarray:
        """Convert µ-law to 16-bit PCM."""
        import audioop
        pcm_bytes = audioop.ulaw2lin(ulaw_data, 2)
        return np.frombuffer(pcm_bytes, dtype=np.int16)
    
    def _check_speech(self, audio_bytes: bytes) -> float:
        """
        Run Silero VAD on EXACTLY 256 samples (for 8kHz).
        
        Returns:
            Speech probability (0.0-1.0)
        """
        try:
            # Must be exactly 256 bytes for 8kHz
            if len(audio_bytes) != self.vad_window_bytes:
                return 0.0
            
            # Convert to PCM int16
            pcm_audio = self._ulaw_to_pcm_int16(audio_bytes)
            
            # Convert to float32 normalized to [-1, 1]
            audio_float = pcm_audio.astype(np.float32) / 32768.0
            audio_tensor = torch.from_numpy(audio_float)
            
            # Get speech probability
            speech_prob = self.model(audio_tensor, self.sample_rate).item()
            return speech_prob
            
        except Exception as e:
            logger.error("vad_inference_error", error=str(e))
            return 0.0
    
    def add_audio(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Add audio and check for speech using Silero VAD.
        
        Batches chunks and runs VAD on 256-sample windows.
        """
        result = {'event': None}
        
        # Add to buffer
        self.buffer.extend(audio_data)
        self.chunk_count += 1
        
        # Run VAD check every 256 bytes (32ms window for 8kHz)
        if len(self.buffer) >= self.vad_window_bytes:
            # Check if we have exactly 256 bytes since last check
            if len(self.buffer) % self.vad_window_bytes < 160:  # Within one chunk
                # Get the last complete window
                window_start = (len(self.buffer) // self.vad_window_bytes - 1) * self.vad_window_bytes
                window = bytes(self.buffer[window_start:window_start + self.vad_window_bytes])
                
                # Get speech probability
                speech_prob = self._check_speech(window)
                is_speech = speech_prob >= self.vad_threshold
                
                # Detect speech start
                if not self.speech_started and is_speech:
                    self.speech_started = True
                    self.silence_samples = 0
                    result['event'] = 'speech_start'
                    print(f"🎙️ Silero VAD: Speech START, prob={speech_prob:.3f}")
                    logger.debug("silero_vad_speech_start", probability=speech_prob)
                
                # Track silence
                if self.speech_started:
                    if not is_speech:
                        self.silence_samples += self.vad_window_bytes
                    else:
                        self.silence_samples = 0
        
        # Periodic logging
        if self.chunk_count % 50 == 0 and self.speech_started:
            silence_ms = self.silence_samples * 1000 / self.sample_rate
            print(f"🔊 Silero VAD: silence={silence_ms:.0f}ms, buffer={len(self.buffer)}B")
        
        if self.speech_started:
            # Check for speech end (with extra buffer for word endings)
            extra_hangover = int((self.sample_rate * 500) / 1000)  # Extra 500ms for natural endings
            if self.silence_samples >= (self.silence_bytes + self.hangover_bytes + extra_hangover):
                if len(self.buffer) >= self.min_bytes:
                    result['event'] = 'speech_end'
                    silence_ms = self.silence_samples * 1000 / self.sample_rate
                    print(f"🛑 Silero VAD: Speech END, silence={silence_ms:.0f}ms, buffer={len(self.buffer)}B")
                    logger.debug("silero_vad_speech_end", 
                               buffer_size=len(self.buffer),
                               silence_ms=silence_ms)
            
            # Check for max buffer
            elif len(self.buffer) >= self.max_bytes:
                result['event'] = 'ready'
                print(f"⚠️ Silero VAD: MAX BUFFER ({len(self.buffer)}B) - forcing processing")
                logger.debug("silero_vad_max_buffer", buffer_size=len(self.buffer))
        
        return result
    
    def get_audio(self) -> Optional[bytes]:
        """Get buffered audio and reset."""
        if len(self.buffer) >= self.min_bytes:
            audio = bytes(self.buffer)
            self.clear()
            return audio
        return None
    
    def has_significant_audio(self) -> bool:
        """Check if has enough audio."""
        return len(self.buffer) >= self.min_bytes and self.speech_started
    
    def clear(self):
        """Clear buffer and reset."""
        self.buffer.clear()
        self.silence_samples = 0
        self.speech_started = False
        self.chunk_count = 0
