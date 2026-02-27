"""
Call Orchestrator - Central coordinator for call processing

Orchestrates the complete call flow:
1. Audio from Twilio → Sarvam STT → Transcript
2. Transcript → Gemini → Structured extraction  
3. State machine → Next action decision
4. Sarvam TTS → Audio response
5. Database persistence & WebSocket events
"""

import asyncio
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.gemini_client import get_gemini_client, ConversationHistory, GeminiResponse
from app.services.stt_client import get_sarvam_stt_client, TranscriptResult, CallAudioState, ulaw_to_pcm
from app.services.silero_vad import SileroVADBuffer  # Use Silero VAD
from app.services.tts_client import get_sarvam_tts_client, Language, TTSResult
from app.services.state_machine import get_state_machine, CallSession, CallState
from app.services.websocket_broadcaster import get_connection_manager
from app.services.twilio_client import twilio_client
from app.models import Call, Complaint, Transcript, Event

logger = structlog.get_logger()


class CallOrchestrator:
    """
    Orchestrates the complete call processing workflow.
    
    Implements turn-based conversation with interrupt capability:
    1. Buffer audio until silence detected (VAD)
    2. Process only after speech ends
    3. While AI speaks, listen for interrupts
    4. If user interrupts, clear Twilio buffer and process new input
    """
    
    def __init__(self):
        """Initialize orchestrator with all service clients."""
        self.gemini = get_gemini_client()
        self.stt = get_sarvam_stt_client()
        self.tts = get_sarvam_tts_client()
        self.state_machine = get_state_machine()
        self.ws_manager = get_connection_manager()
        
        # Active sessions
        self.active_sessions: Dict[str, CallSession] = {}
        self.conversation_history: Dict[str, ConversationHistory] = {}
        self.audio_buffers: Dict[str, AudioBuffer] = {}
        self.audio_states: Dict[str, CallAudioState] = {}  # Track speaking/processing state
        
        logger.info("call_orchestrator_initialized")
    
    async def start_call(
        self,
        session_id: str,
        caller_number: str,
        twilio_call_sid: str,
        db: AsyncSession,
        language: str = "hi"
    ) -> CallSession:
        """
        Start a new call session.
        
        Args:
            session_id: Unique session identifier
            caller_number: Caller's phone number
            twilio_call_sid: Twilio call SID
            db: Database session
            language: Language code (gu/hi/en), defaults to Hindi
        
        Returns:
            New CallSession
        """
        # Validate and normalize language code
        from app.utils.language import validate_language_code, get_language_name
        language = validate_language_code(language)
        
        logger.info("starting_call_session", 
                   session_id=session_id, 
                   caller=caller_number,
                   language=language,
                   language_name=get_language_name(language))
        
        # Create call session
        session = CallSession(
            session_id=session_id,
            caller_number=caller_number,
            state=CallState.INIT
        )
        
        # Create conversation history with selected language
        history = ConversationHistory(
            session_id=session_id,
            language=language
        )
        logger.info("history_created", session_id=session_id, history_language=history.language)
        
        # Initialize Silero VAD buffer (uses defaults from silero_vad.py)
        buffer = SileroVADBuffer(
            min_audio_ms=600,
            max_audio_ms=10000,
            silence_threshold_ms=1200,
            hangover_ms=300
            # vad_threshold defaults to 0.6 (defined in silero_vad.py)
        )
        
        # Initialize audio state
        audio_state = CallAudioState()
        
        # Store in memory
        self.active_sessions[session_id] = session
        self.conversation_history[session_id] = history
        self.audio_buffers[session_id] = buffer
        self.audio_states[session_id] = audio_state
        
        # Create database record
        db_call = Call(
            session_id=session_id,
            caller_number=caller_number,
            twilio_call_sid=twilio_call_sid,
            status='active',
            current_state='init',
            start_time=datetime.utcnow()
        )
        db.add(db_call)
        await db.commit()
        
        # Broadcast call_started event
        await self.broadcast_event(session_id, "call_started", {
            "session_id": session_id,
            "caller": caller_number,
            "callerId": caller_number,
            "status": "active",
            "language": "Hindi",
            "intent": "Incoming Call",
            "sentiment": "Neutral",
            "duration": "0m 0s",
            "start_time": datetime.utcnow().isoformat()
        }, db)
        
        # Update dashboard
        await self.broadcast_dashboard_update()
        
        logger.info("call_started", session_id=session_id, caller=caller_number)
        
        return session

    async def broadcast_dashboard_update(self):
        """Broadcast active calls list to dashboard."""
        try:
            active = []
            for s_id, session in self.active_sessions.items():
                # Calculate duration
                duration_seconds = int((datetime.utcnow() - session.created_at).total_seconds())
                duration_str = f"{duration_seconds // 60}m {duration_seconds % 60}s"
                
                # Determine status based on state
                status = "active" if session.state.value in ["processing", "collecting", "confirming"] else session.state.value
                
                # Get current intent from form data
                intent = session.current_form.get("complaint_type", "General Inquiry")
                if intent == "missed_collection":
                    intent = "Garbage Collection"
                elif intent == "streetlight":
                    intent = "Streetlight Issue"
                elif intent == "water_supply":
                    intent = "Water Supply"
                elif intent == "drainage":
                    intent = "Drainage Issue"
                
                # Determine sentiment from conversation history
                sentiment = "Neutral"  # Default
                history = self.conversation_history.get(s_id)
                if history and hasattr(history, 'sentiment'):
                    sentiment = history.sentiment.capitalize()
                
                active.append({
                    "id": s_id,
                    "session_id": s_id,
                    "callerId": session.caller_number,
                    "state": session.state.value,
                    "status": status,
                    "language": session.language.capitalize() if session.language else "Hindi",
                    "caller_number": session.caller_number,
                    "duration": duration_str,
                    "intent": intent,
                    "sentiment": sentiment,
                    "created_at": session.created_at.isoformat(),
                    "last_activity": session.last_activity.isoformat(),
                    "current_form": session.current_form,
                    "missing_fields": session.missing_fields
                })
            
            await self.ws_manager.broadcast({
                "type": "active_calls_update",
                "sessionId": "dashboard",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "data": active,
                    "count": len(active)
                }
            })
            
            logger.info("dashboard_update_broadcasted", active_calls_count=len(active))
        except Exception as e:
            logger.error("dashboard_broadcast_error", error=str(e))

    
    async def process_audio_chunk(
        self,
        session_id: str,
        audio_data: bytes,
        stream_sid: str = None,
        is_ulaw: bool = True,
        db: Optional[AsyncSession] = None
    ) -> tuple[Optional[bytes], bool, bool]:
        """
        Process incoming audio chunk from Twilio with VAD.
        
        Args:
            session_id: Call session ID
            audio_data: Raw audio bytes (µ-law from Twilio)
            stream_sid: Twilio stream SID
            is_ulaw: Whether audio is µ-law encoded
            db: Database session
        
        Returns:
            Tuple of (µ-law audio bytes if response generated, should_clear_twilio_buffer, should_end_call)
        """
        session = self.active_sessions.get(session_id)
        if not session:
            logger.warning("session_not_found", session_id=session_id)
            return None, False, False
        
        buffer = self.audio_buffers.get(session_id)
        audio_state = self.audio_states.get(session_id)
        if not buffer or not audio_state:
            return None, False, False
        
        try:
            # Store stream_sid for later use
            if stream_sid:
                session.stream_sid = stream_sid
            
            # Add audio to buffer and check for VAD events
            vad_result = buffer.add_audio(audio_data)
            vad_event = vad_result.get('event')
            
            # INTERRUPT LOGIC DISABLED FOR HACKATHON - too aggressive
            # TODO: Re-enable and tune in production
            # Check for interrupt: user started speaking while AI is speaking
            # should_interrupt = False
            # if audio_state.is_speaking and vad_event == 'speech_start':
            #     logger.info("interrupt_detected", session_id=session_id)
            #     audio_state.pending_interrupt = True
            # 
            # # If AI is speaking and we have significant audio, prepare to interrupt
            # if audio_state.is_speaking and buffer.has_significant_audio():
            #     should_interrupt = True
            #     audio_state.is_speaking = False
            #     audio_state.pending_interrupt = True
            #     logger.info("interrupt_with_audio", session_id=session_id, buffer_size=len(buffer.buffer))
            
            # Don't process if AI is currently speaking
            if audio_state.is_speaking:
                # Clear buffer while AI is speaking to avoid accumulating user audio
                buffer.clear()
                return None, False, False
            
            # Don't process if already processing a request
            if audio_state.is_processing:
                return None, False, False
            
            # Process when speech ends or buffer is full
            if vad_event in ('speech_end', 'ready'):
                audio_chunk = buffer.get_audio()
                if audio_chunk:
                    print(f"🎤 VAD: Speech detected, processing audio_size={len(audio_chunk)} bytes, event={vad_event}")
                    logger.info("🎤 VAD: Speech detected, processing", 
                              session_id=session_id, 
                              audio_size_bytes=len(audio_chunk),
                              vad_event=vad_event)
                    
                    # Mark as processing
                    audio_state.is_processing = True
                    
                    try:
                        # Process through STT -> Gemini -> TTS
                        result = await self.process_audio_for_transcription(session_id, audio_chunk, db)
                        
                        if result:
                            # Mark as speaking (AI will be speaking)
                            audio_state.is_speaking = True
                        
                        # Check if call should end (state changed to ENDED)
                        current_session = self.active_sessions.get(session_id)
                        should_end = current_session and current_session.state == CallState.ENDED
                        
                        return result, False, should_end
                    finally:
                        audio_state.is_processing = False
            
            return None, False, False
            
        except Exception as e:
            logger.error("audio_chunk_processing_error", error=str(e), session_id=session_id, traceback=str(__import__("traceback").format_exc()))
            if audio_state:
                audio_state.is_processing = False
            return None, False, False
    
        if audio_state:
            audio_state.is_speaking = False
            logger.debug("speaking_done", session_id=session_id)
            
            # Broadcast listening state (AI finished speaking, now listening)
            # We can't use await here easily as this might be synchronous or called from callback
            # But mark_speaking_done is usually called from websocket handler which is async
            # Use asyncio.create_task if needed, but let's check if we can make this async
            # For now, we will just log it, but in real flow, we need to await broadcast_event.
            # Actually, mark_speaking_done is likely called from main.py websocket loop.
            # Let's see if we can just fire and forget or if we need to make it async.
            # Inspecting call_orchestrator.py, mark_speaking_done is sync.
            # We will convert it to async.
    
    async def mark_speaking_done(self, session_id: str, db: Optional[AsyncSession] = None):
        """Mark that AI has finished speaking."""
        audio_state = self.audio_states.get(session_id)
        if audio_state:
            audio_state.is_speaking = False
            logger.debug("speaking_done", session_id=session_id)
            
            await self.broadcast_event(session_id, "system_state", {
                "session_id": session_id,
                "state": "listening"
            }, db)
    
    async def generate_initial_greeting(
        self,
        session_id: str,
        db: Optional[AsyncSession] = None
    ) -> Optional[bytes]:
        """Generate initial greeting audio when call starts.
        
        Returns:
            µ-law audio bytes for greeting
        """
        session = self.active_sessions.get(session_id)
        history = self.conversation_history.get(session_id)
        if not session or not history:
            return None
        
        try:
            # Get language-specific greeting
            from app.services.tts_client import Language
            from app.utils.language import get_sarvam_language
            
            # Map session language to greeting text
            greetings = {
                "gu": "નમસ્તે। હું વડોદરા મ્યુનિસિપલ કોર્પોરેશનની સહાયક છું। તમારી શું ફરિયાદ છે?",
                "hi": "नमस्ते। मैं वडोदरा नगर निगम की सहायक हूं। आपकी क्या शिकायत है?",
                "en": "Hello. I am the Vadodara Municipal Corporation assistant. What is your complaint?"
            }
            
            greeting_text = greetings.get(history.language, greetings["hi"])
            sarvam_lang = get_sarvam_language(history.language)
            
            # Convert to Language enum
            lang_enum = Language.GUJARATI if history.language == "gu" else \
                       Language.ENGLISH if history.language == "en" else \
                       Language.HINDI
            
            logger.info("generating_greeting", 
                       session_id=session_id, 
                       language=history.language,
                       text=greeting_text)
            
            # Generate TTS
            tts_result = await self.tts.synthesize(
                text=greeting_text,
                language=lang_enum
            )
            
            logger.info("initial_greeting_generated", 
                       session_id=session_id, 
                       audio_size=len(tts_result.audio_data),
                       language=history.language)
            
            # Mark as speaking
            audio_state = self.audio_states.get(session_id)
            if audio_state:
                audio_state.is_speaking = True
            
            return tts_result.audio_data
            
        except Exception as e:
            logger.error("initial_greeting_error", error=str(e), session_id=session_id)
            return None
    
    async def process_audio_for_transcription(
        self,
        session_id: str,
        audio_chunk: bytes,
        db: Optional[AsyncSession] = None
    ) -> Optional[bytes]:
        """Process audio chunk through STT and handle transcript.
        
        Returns:
            µ-law audio bytes for TTS response, or None
        """
        session = self.active_sessions.get(session_id)
        history = self.conversation_history.get(session_id)
        
        if not session or not history:
            return None
        
        try:
            import time
            start_time = time.time()
            
            # Convert µ-law to PCM for STT (Sarvam expects PCM/WAV)
            pcm_audio = ulaw_to_pcm(audio_chunk)
            
            print(f"📤 STT: Sending {len(pcm_audio)} bytes to Sarvam, language={history.language}")
            logger.info("📤 STT: Sending audio to Sarvam", 
                       session_id=session_id,
                       audio_size_bytes=len(pcm_audio),
                       language=history.language)
            
            # Use batch transcription instead of streaming for simplicity
            stt_start = time.time()
            transcript_result = await self.stt.transcribe_batch(pcm_audio, history.language)
            stt_time = time.time() - stt_start
            
            if transcript_result and transcript_result.text:
                print(f"📥 STT: Received transcript='{transcript_result.text}' confidence={transcript_result.confidence} time={int(stt_time * 1000)}ms")
                logger.info("📥 STT: Transcription received", 
                           session_id=session_id, 
                           transcript=transcript_result.text,
                           confidence=transcript_result.confidence,
                           stt_time_ms=int(stt_time * 1000))
                
                # Process final transcript through Gemini and get TTS response
                result = await self.process_transcript(
                    session_id,
                    transcript_result.text,
                    transcript_result.confidence,
                    db
                )
                
                total_time = time.time() - start_time
                print(f"✅ Audio processing complete: total_time={int(total_time * 1000)}ms")
                logger.info("✅ Audio processing complete", 
                           session_id=session_id,
                           total_time_ms=int(total_time * 1000))
                
                return result
            else:
                logger.warning("⚠️ STT: No transcript returned", session_id=session_id)
            
            return None
            
        except Exception as e:
            logger.error("❌ Transcription error", error=str(e), session_id=session_id)
            return None
    
    async def process_transcript(
        self,
        session_id: str,
        transcript: str,
        confidence: float,
        db: Optional[AsyncSession] = None
    ) -> Optional[bytes]:
        """
        Process final transcript through Gemini and generate response.
        
        Args:
            session_id: Call session ID
            transcript: Transcribed text
            confidence: Transcription confidence
            db: Database session
        
        Returns:
            µ-law audio bytes for TTS response
        """
        session = self.active_sessions.get(session_id)
        history = self.conversation_history.get(session_id)
        
        if not session or not history:
            return None
        
        try:
            import time
            
            # Update session state to PROCESSING
            session = self.state_machine.transition(session, CallState.PROCESSING, "received_transcript")
            
            # Get current sequence number from history tracker
            current_seq = history.get_next_sequence()
            
            # Save user transcript to database (before Gemini call)
            if db:
                try:
                    from sqlalchemy import select
                    query = select(Call).where(Call.session_id == session_id)
                    result = await db.execute(query)
                    db_call = result.scalar_one_or_none()
                    
                    if db_call:
                        db_transcript = Transcript(
                            call_id=db_call.id,
                            sequence_number=current_seq,
                            role='user',
                            text=transcript,
                            language=history.language,  # Use history.language not session.language
                            confidence=confidence,
                            is_final=True
                        )
                        db.add(db_transcript)
                        await db.commit()
                        # CRITICAL: Increment sequence after successful save
                        history.db_sequence += 1
                except Exception as db_error:
                    logger.warning("transcript_db_save_error", error=str(db_error))
                    try:
                        await db.rollback()
                    except:
                        pass
            
            # Broadcast final transcript
            await self.broadcast_event(session_id, "final_transcript", {
                "session_id": session_id,
                "text": transcript,
                "confidence": confidence
            }, db)
            
            # Broadcast thinking state
            await self.broadcast_event(session_id, "system_state", {
                "session_id": session_id,
                "state": "thinking"
            }, db)
            
            print(f"📤 GEMINI: Sending request - user_input='{transcript}' language={history.language}")
            logger.info("📤 GEMINI: Sending request", 
                       session_id=session_id,
                       user_input=transcript,
                       language=history.language,  # Use history.language
                       current_form=session.current_form)
            
            # Process through Gemini with timeout handling
            import asyncio
            gemini_start = time.time()
            
            # Create task for Gemini processing
            gemini_task = asyncio.create_task(self.gemini.process(
                transcript=transcript,
                history=history,
                language=history.language
            ))
            
            # Wait with timeout to prevent WebSocket disconnection
            # Give Gemini up to 20s (accounts for retries and API latency)
            try:
                gemini_response = await asyncio.wait_for(gemini_task, timeout=20.0)
                gemini_time = time.time() - gemini_start
                if gemini_time > 8:
                    logger.warning("gemini_slow_response", 
                                  session_id=session_id, 
                                  time_ms=int(gemini_time * 1000))
            except asyncio.TimeoutError:
                logger.error("gemini_timeout", session_id=session_id)
                # Create fallback response
                from app.services.gemini_client import GeminiResponse, NextAction
                wait_messages = {
                    "gu": "માફ કરશો, મને સમજવામાં મુશ્કેલી આવી રહી છે. કૃપા કરીને ફરી કહો?",
                    "hi": "माफ़ करें, मुझे समझने में कठिनाई हो रही है। कृपया फिर से बताएं?",
                    "en": "Sorry, I'm having trouble understanding. Could you please repeat?"
                }
                gemini_response = GeminiResponse(
                    intent="complaint",
                    next_action=NextAction.ASK,
                    speak=wait_messages.get(history.language, wait_messages["hi"]),
                    fields={},
                    missing_fields=[],
                    confidence={}
                )
                gemini_time = time.time() - gemini_start
            
            print(f"📥 GEMINI: Response - intent={gemini_response.intent} action={gemini_response.next_action} response='{gemini_response.speak}' time={int(gemini_time * 1000)}ms")
            logger.info("📥 GEMINI: Response received", 
                       session_id=session_id,
                       intent=gemini_response.intent,
                       next_action=gemini_response.next_action,
                       ai_response=gemini_response.speak,
                       extracted_fields=gemini_response.fields,
                       missing_fields=gemini_response.missing_fields,
                       gemini_time_ms=int(gemini_time * 1000))
            
            # Determine next state based on Gemini response
            next_state = self.state_machine.process_gemini_response(
                session=session,
                gemini_response=gemini_response,
                transcript=transcript
            )
            
            # Transition to next state
            session = self.state_machine.transition(session, next_state, f"gemini_action_{gemini_response.next_action}")
            
            # Broadcast form update
            await self.broadcast_event(session_id, "form_update", {
                "session_id": session_id,
                "form": session.current_form,
                "missing_fields": session.missing_fields,
                "confidence": session.confidence_scores
            }, db)
            
            # Save extracted fields to call_metadata in real-time
            if db and session.current_form:
                try:
                    from sqlalchemy import select, update
                    query = select(Call).where(Call.session_id == session_id)
                    result = await db.execute(query)
                    db_call = result.scalar_one_or_none()
                    
                    if db_call:
                        # Build call_metadata with current form data
                        call_metadata = session.current_form.copy()
                        call_metadata["confidence_scores"] = session.confidence_scores
                        call_metadata["missing_fields"] = session.missing_fields
                        
                        # Map complaint_type to readable intent
                        complaint_type = call_metadata.get("complaint_type", "")
                        intent_map = {
                            "missed_collection": "Garbage Collection",
                            "garbage_collection": "Garbage Collection",
                            "garbage": "Garbage Collection",
                            "streetlight": "Streetlight Issue",
                            "water_supply": "Water Supply",
                            "water": "Water Supply",
                            "drainage": "Drainage Issue",
                            "road_repair": "Road Repair",
                            "road": "Road Repair",
                            "other": "General Inquiry"
                        }
                        call_metadata["intent"] = intent_map.get(str(complaint_type).lower(), "Complaint") if complaint_type else "General Inquiry"
                        
                        update_query = update(Call).where(Call.id == db_call.id).values(
                            call_metadata=call_metadata
                        )
                        await db.execute(update_query)
                        await db.commit()
                        
                        logger.info("call_metadata_saved", 
                                   session_id=session_id, 
                                   fields=list(session.current_form.keys()))
                except Exception as meta_error:
                    logger.warning("call_metadata_save_error", error=str(meta_error))
                    try:
                        await db.rollback()
                    except:
                        pass
            
            # Handle state-specific actions
            tts_audio = None
            
            # Generate TTS response first if there's something to say
            if gemini_response.speak:
                tts_audio = await self.generate_speech_response(
                    session_id,
                    gemini_response.speak,
                    history.language,  # Fixed: use history.language not session.language
                    db
                )
            
            # Handle filing if state is FILING
            if next_state == CallState.FILING:
                # File the complaint but DO NOT end the call
                # Gemini should ask "anything else?" and wait for response
                await self.file_complaint(session_id, db)
                # Set state back to ASKING so we can continue the conversation
                session.state = CallState.ASKING
                logger.info("complaint_filed_waiting_for_more_help", session_id=session_id)
            
            # Handle call ending - ONLY when Gemini explicitly says "end"
            elif next_state == CallState.ENDED:
                # DON'T call end_call here - the TTS needs to play first!
                # The session state is already ENDED, process_audio_chunk will detect this
                # and return should_end=True, which tells the API to wait for TTS mark then end
                session.state = CallState.ENDED
                logger.info("call_ending_after_tts", session_id=session_id)
            
            return tts_audio
            
        except Exception as e:
            logger.error("transcript_processing_error", error=str(e), session_id=session_id)
            return None
    
    async def generate_speech_response(
        self,
        session_id: str,
        text: str,
        language: str,
        db: Optional[AsyncSession] = None
    ) -> Optional[bytes]:
        """Generate TTS audio for AI response.
        
        Returns:
            µ-law audio bytes for Twilio playback
        """
        try:
            import time
            tts_start = time.time()
            
            # Map language code
            lang_map = {
                "hi": Language.HINDI,
                "gu": Language.GUJARATI,
                "en": Language.ENGLISH
            }
            tts_language = lang_map.get(language, Language.HINDI)
            
            print(f"📤 TTS: Sending text='{text}' language={language}")
            logger.info("📤 TTS: Sending text to Sarvam", 
                       session_id=session_id,
                       text_to_speak=text,
                       language=language)
            
            # Broadcast speaking state
            await self.broadcast_event(session_id, "system_state", {
                "session_id": session_id,
                "state": "speaking"
            }, db)
            
            # Generate TTS - returns µ-law audio
            tts_result = await self.tts.synthesize(
                text=text,
                language=tts_language
            )
            
            tts_time = time.time() - tts_start
            
            print(f"📥 TTS: Audio generated size={len(tts_result.audio_data)} bytes time={int(tts_time * 1000)}ms")
            logger.info("📥 TTS: Audio generated", 
                       session_id=session_id,
                       audio_size_bytes=len(tts_result.audio_data),
                       tts_time_ms=int(tts_time * 1000))
            
            # Broadcast speak action (don't fail if this errors)
            try:
                await self.broadcast_event(session_id, "speak_action", {
                    "session_id": session_id,
                    "tts_text": text,
                    "language": language
                }, db)
            except Exception as broadcast_error:
                logger.warning("broadcast_error", error=str(broadcast_error))
            
            # Save assistant transcript (don't fail if this errors)
            if db:
                try:
                    from sqlalchemy import select
                    query = select(Call).where(Call.session_id == session_id)
                    result = await db.execute(query)
                    db_call = result.scalar_one_or_none()
                    
                    if db_call:
                        history = self.conversation_history.get(session_id)
                        # Use current sequence number and increment
                        seq_num = history.get_next_sequence() if history else 0
                        db_transcript = Transcript(
                            call_id=db_call.id,
                            sequence_number=seq_num,
                            role='assistant',
                            text=text,
                            language=language,
                            is_final=True
                        )
                        db.add(db_transcript)
                        await db.commit()
                        # CRITICAL: Increment sequence after successful save
                        if history:
                            history.db_sequence += 1
                except Exception as db_error:
                    logger.warning("assistant_transcript_db_error", error=str(db_error))
                    try:
                        await db.rollback()
                    except:
                        pass
            
            # Return µ-law audio bytes
            return tts_result.audio_data
            
        except Exception as e:
            logger.error("tts_generation_error", error=str(e), session_id=session_id)
            return None
    
    async def file_complaint(
        self,
        session_id: str,
        db: AsyncSession
    ) -> Optional[str]:
        """File the complaint in database."""
        session = self.active_sessions.get(session_id)
        if not session:
            return None
        
        try:
            # Generate ticket ID (VMC-YYYY-NNNNN)
            year = datetime.utcnow().year
            # In production, query DB for next sequence
            import random
            sequence = random.randint(1, 99999)
            ticket_id = f"VMC-{year}-{sequence:05d}"
            
            # Get call UUID
            from sqlalchemy import select
            query = select(Call).where(Call.session_id == session_id)
            result = await db.execute(query)
            db_call = result.scalar_one_or_none()
            
            if not db_call:
                logger.error("call_not_found_for_complaint", session_id=session_id)
                return None
            
            # Mock employee pool for assignment
            MOCK_EMPLOYEES = [
                "e1a2b3c4-5d6e-7f8a-9012-1a2b3c4d5e6f",  # Rajesh Kumar
                "f2b3c4d5-6e7f-8901-2345-2b3c4d5e6f7a",  # Priya Shah
                "a3c4d5e6-7f89-0123-4567-3c4d5e6f7a8b",  # Amit Patel
                "b4d5e6f7-8901-2345-6789-4d5e6f7a8b9c",  # Neha Desai
                "c5e6f7a8-9012-3456-789a-5e6f7a8b9c0d",  # Vikram Singh
            ]
            
            # Randomly assign to an employee
            import random
            assigned_employee_id = uuid.UUID(random.choice(MOCK_EMPLOYEES))
            
            # Create complaint
            complaint = Complaint(
                call_id=db_call.id,  # Use proper UUID
                ticket_id=ticket_id,
                complaint_type=session.current_form.get("complaint_type", "other"),
                description=session.current_form.get("description", ""),
                address=session.current_form.get("address", ""),
                locality=session.current_form.get("locality"),
                pincode=session.current_form.get("pincode"),
                contact_number=session.current_form.get("contact_number"),
                landmark=session.current_form.get("landmark"),
                confidence_scores=session.confidence_scores,
                status='registered',
                assigned_to=assigned_employee_id  # Assign to random employee
            )
            
            db.add(complaint)
            await db.commit()
            
            # Broadcast case created
            await self.broadcast_event(session_id, "case_created", {
                "session_id": session_id,
                "ticket_id": ticket_id,
                "status": "registered"
            }, db)
            
            logger.info("complaint_filed", session_id=session_id, ticket_id=ticket_id)
            
            return ticket_id
            
        except Exception as e:
            logger.error("complaint_filing_error", error=str(e), session_id=session_id)
            return None
    
    async def end_call(
        self,
        session_id: str,
        db: AsyncSession
    ) -> None:
        """End a call session and cleanup."""
        session = self.active_sessions.get(session_id)
        if not session:
            return
        
        try:
            # Update database
            end_time = datetime.utcnow()
            duration = int((end_time - session.created_at).total_seconds())
            
            # Update call record in database
            from sqlalchemy import select, update
            query = select(Call).where(Call.session_id == session_id)
            result = await db.execute(query)
            db_call = result.scalar_one_or_none()
            
            if db_call:
                # Try to get accurate duration from Twilio
                if db_call.twilio_call_sid:
                    twilio_duration = twilio_client.get_call_duration(db_call.twilio_call_sid)
                    if twilio_duration is not None:
                        duration = twilio_duration
                        logger.info("using_twilio_duration", session_id=session_id, duration=duration)
                # Build call_metadata with extracted form data and intent
                call_metadata = session.current_form.copy() if session.current_form else {}
                
                # Map complaint_type to readable intent
                complaint_type = call_metadata.get("complaint_type", "")
                intent_map = {
                    "missed_collection": "Garbage Collection",
                    "garbage": "Garbage Collection",
                    "streetlight": "Streetlight Issue",
                    "water_supply": "Water Supply",
                    "water": "Water Supply",
                    "drainage": "Drainage Issue",
                    "road": "Road Repair",
                    "other": "General Inquiry"
                }
                call_metadata["intent"] = intent_map.get(complaint_type.lower(), "General Inquiry") if complaint_type else "General Inquiry"
                call_metadata["confidence_scores"] = session.confidence_scores
                
                update_query = update(Call).where(Call.id == db_call.id).values(
                    end_time=end_time,
                    duration_seconds=duration,
                    status='completed',
                    call_metadata=call_metadata
                )
                await db.execute(update_query)
                await db.commit()
            
            # Broadcast call ended
            await self.broadcast_event(session_id, "call_ended", {
                "session_id": session_id,
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "status": "completed"
            }, db)
            
            # Cleanup
            self.active_sessions.pop(session_id, None)
            self.conversation_history.pop(session_id, None)
            self.audio_buffers.pop(session_id, None)
            self.audio_states.pop(session_id, None)
            
            # End the Twilio call (hang up the phone)
            if db_call and db_call.twilio_call_sid:
                twilio_client.end_call(db_call.twilio_call_sid)
            
            # Close STT connection
            try:
                await self.stt.close()
            except:
                pass
            
            # Update dashboard
            await self.broadcast_dashboard_update()
            
            logger.info("call_ended", session_id=session_id, duration=duration)
            
        except Exception as e:
            logger.error("call_end_error", error=str(e), session_id=session_id)
    
    async def broadcast_event(
        self,
        session_id: str,
        event_type: str,
        event_data: Dict[str, Any],
        db: Optional[AsyncSession] = None
    ) -> None:
        """Broadcast event to WebSocket clients and save to database."""
        # Save to database (don't fail the whole operation if DB fails)
        if db:
            try:
                from sqlalchemy import select
                query = select(Call).where(Call.session_id == session_id)
                result = await db.execute(query)
                db_call = result.scalar_one_or_none()
                
                if db_call:
                    db_event = Event(
                        call_id=db_call.id,
                        event_type=event_type,
                        event_data=event_data,
                        timestamp=datetime.utcnow()
                    )
                    db.add(db_event)
                    await db.commit()
            except Exception as db_error:
                logger.warning("event_db_save_error", error=str(db_error), event_type=event_type)
                try:
                    await db.rollback()
                except:
                    pass
        
        # Broadcast via WebSocket (don't fail if this errors)
        try:
            # Broadcast to general dashboard
            await self.ws_manager.broadcast({
                "type": event_type,
                "sessionId": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "data": event_data
            })
            
            # Also broadcast to specific call room if exists
            await self.ws_manager.broadcast_to_room(session_id, {
                "type": event_type,
                "sessionId": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "data": event_data
            })
        except Exception as ws_error:
            logger.warning("websocket_broadcast_error", error=str(ws_error), event_type=event_type)


# Singleton instance
_orchestrator: Optional[CallOrchestrator] = None

def get_call_orchestrator() -> CallOrchestrator:
    """Get or create the singleton orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = CallOrchestrator()
    return _orchestrator
