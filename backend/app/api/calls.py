"""
Calls API - Handles incoming Twilio calls and WebSocket audio streaming
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Request, Form, Response, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import asyncio
import uuid
import base64
import json
import struct
from datetime import datetime

import structlog

from app.db.database import get_db
from app.services.call_orchestrator import get_call_orchestrator
from app.services.twilio_client import twilio_client

logger = structlog.get_logger()

router = APIRouter()
orchestrator = get_call_orchestrator()

# Intent mapping from complaint_type
COMPLAINT_TYPE_TO_INTENT = {
    "road_repair": "Road Repair",
    "garbage_collection": "Garbage Collection",
    "missed_collection": "Missed Collection",
    "streetlight": "Streetlight Issue",
    "water_supply": "Water Supply",
    "drainage": "Drainage Issue",
    "stray_animal": "Stray Animal",
    "encroachment": "Encroachment", 
    "other": "Other Issue"
}

def _get_intent_from_metadata(metadata):
    """Get user-friendly intent from call metadata."""
    if not metadata:
        return "General Inquiry"
    
    # First try to get complaint_type and map it
    complaint_type = metadata.get("complaint_type")
    if complaint_type:
        return COMPLAINT_TYPE_TO_INTENT.get(complaint_type, complaint_type.replace("_", " ").title())
    
    # Then try direct intent field
    intent = metadata.get("intent", "")
    if intent and intent.lower() != "complaint":
        return intent if intent != "unknown" else "General Inquiry"
    
    return "General Inquiry"


@router.post("/start", response_class=PlainTextResponse)
async def start_call(
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Twilio webhook to start an incoming call.
    
    Returns TwiML to set up media stream.
    """
    try:
        # Generate session ID
        session_id = f"call_{uuid.uuid4().hex[:12]}"
        
        # Create call session
        await orchestrator.start_call(
session_id=session_id,
            caller_number=From,
            twilio_call_sid=CallSid,
            db=db
        )
        
        # Generate TwiML for language IVR and media streaming
        stream_url = f"wss://{request.headers.get('host', 'localhost')}/api/calls/stream/{session_id}"
        
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{stream_url}">
            <Parameter name="session_id" value="{session_id}"/>
        </Stream>
    </Connect>
</Response>"""
        
        logger.info("call_started_twiml_generated", session_id=session_id, from_number=From)
        
        return twiml
        
    except Exception as e:
        logger.error("start_call_error", error=str(e))
        # Return error TwiML
        return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Sorry, there was an error. Please try again later.</Say>
    <Hangup/>
</Response>"""


@router.websocket("/stream/{session_id}")
async def stream_audio(
    websocket: WebSocket, 
    session_id: str,
    lang: str = Query("hi", description="Language code from IVR: gu/hi/en")
):
    """
    WebSocket endpoint for Twilio media stream.
    
    Implements turn-based conversation with interrupt capability:
    - Buffers audio until silence detected (VAD)
    - Processes speech through STT -> Gemini -> TTS  
    - Sends clear message if user interrupts while AI is speaking
    
    Args:
        session_id: Unique call session identifier
        lang: Language selected from IVR (gu=Gujarati, hi=Hindi, en=English)
    """
    logger.info("websocket_request", session_id=session_id, language=lang)
    print(f"DEBUG: WebSocket request received for session {session_id} with language {lang}")
    await websocket.accept()
    print(f"DEBUG: WebSocket accepted for session {session_id}")
    
    # Track pending end_call to wait for TTS mark event
    pending_end_call = False
    farewell_mark_id = None
    logger.info("websocket_connected", session_id=session_id, language=lang)
    
    try:
        from app.db.database import async_session_factory
        print("DEBUG: Getting DB session...")
        async with async_session_factory() as db:
            print(f"DEBUG: DB session obtained. Starting loop with language={lang}...")
            stream_sid = None
            call_initialized = False  # Track if we've created the call session
            
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                event = message.get("event")
                
                if event == "connected":
                    print(f"DEBUG: Event: connected")
                    logger.info("twilio_stream_connected", session_id=session_id)
                
                elif event == "start":
                    stream_sid = message.get("start", {}).get("streamSid")
                    call_params = message.get("start", {})
                    custom_params = call_params.get("customParameters", {})
                    caller_number = custom_params.get("caller", "Unknown")
                    
                    # Extract language from custom parameters (more reliable than query param)
                    # Use 'lang' from query as fallback, but prefer 'language' from <Parameter>
                    language_param = custom_params.get("language")
                    if language_param:
                        lang = language_param
                        logger.info("using_language_from_params", language=lang)
                    
                    print(f"DEBUG: Event: start, streamSid={stream_sid}, caller={caller_number}, language={lang}")
                    logger.info("twilio_stream_started", session_id=session_id, stream_sid=stream_sid, language=lang)
                    
                    # Create call session with language if not already created
                    if not call_initialized:
                        # Check if session already exists (may have been created by /api/calls/start)
                        existing_session = orchestrator.active_sessions.get(session_id)
                        
                        if existing_session:
                            logger.info("call_session_already_exists", session_id=session_id)
                            call_initialized = True
                            
                            # Update language in existing session's history
                            history = orchestrator.conversation_history.get(session_id)
                            if history and history.language != lang:
                                logger.info("updating_session_language", 
                                          session_id=session_id, 
                                          old_lang=history.language, 
                                          new_lang=lang)
                                history.language = lang
                        else:
                            # Create new session
                            try:
                                await orchestrator.start_call(
                                    session_id=session_id,
                                    caller_number=caller_number,
                                    twilio_call_sid=call_params.get("callSid", session_id),
                                    db=db,
                                    language=lang  # Pass language here!
                                )
                                call_initialized = True
                                logger.info("call_session_created", session_id=session_id, language=lang)
                            except Exception as e:
                                logger.error("call_session_creation_error", error=str(e), session_id=session_id)
                    
                    # Send initial greeting in selected language
                    greeting_audio = await orchestrator.generate_initial_greeting(session_id, db)
                    if greeting_audio and stream_sid:
                        print(f"DEBUG: Sending initial greeting, size={len(greeting_audio)} bytes")
                        
                        # Send greeting in chunks
                        chunk_size = 160
                        for i in range(0, len(greeting_audio), chunk_size):
                            chunk = greeting_audio[i:i + chunk_size]
                            chunk_payload = base64.b64encode(chunk).decode('utf-8')
                            
                            response_message = {
                                "event": "media",
                                "streamSid": stream_sid,
                                "media": {
                                    "payload": chunk_payload
                                }
                            }
                            await websocket.send_text(json.dumps(response_message))
                        
                        # Send mark
                        mark_message = {
                            "event": "mark",
                            "streamSid": stream_sid,
                            "mark": {
                                "name": "greeting_done"
                            }
                        }
                        await websocket.send_text(json.dumps(mark_message))
                        print("DEBUG: Initial greeting sent")
                
                elif event == "media":
                    payload = message.get("media", {}).get("payload", "")
                    
                    if payload:
                        audio_data = base64.b64decode(payload)
                        
                        # Log periodically
                        chunk_count = message.get("media", {}).get("chunk", "0")
                        if int(chunk_count) % 1000 == 1:
                            print(f"DEBUG: Media chunk={chunk_count}, size={len(audio_data)}")
                        
                        # Process through orchestrator (returns tuple with 3 values now)
                        tts_audio, should_clear, should_end_call = await orchestrator.process_audio_chunk(
                            session_id=session_id,
                            audio_data=audio_data,
                            stream_sid=stream_sid,
                            is_ulaw=True,
                            db=db
                        )
                        
                        # If user interrupted, clear Twilio's audio buffer
                        if should_clear and stream_sid:
                            print("DEBUG: Sending clear message (user interrupted)")
                            clear_message = {
                                "event": "clear",
                                "streamSid": stream_sid
                            }
                            await websocket.send_text(json.dumps(clear_message))
                            logger.info("twilio_buffer_cleared", session_id=session_id)
                        
                        # If TTS response generated, send to Twilio
                        if tts_audio and stream_sid:
                            print(f"DEBUG: TTS audio generated, size={len(tts_audio)} bytes")
                            logger.info("sending_tts_response", session_id=session_id, audio_size=len(tts_audio))
                            
                            # Send audio in chunks (Twilio expects ~20ms chunks)
                            chunk_size = 160  # 20ms of audio at 8kHz µ-law
                            for i in range(0, len(tts_audio), chunk_size):
                                chunk = tts_audio[i:i + chunk_size]
                                chunk_payload = base64.b64encode(chunk).decode('utf-8')
                                
                                response_message = {
                                    "event": "media",
                                    "streamSid": stream_sid,
                                    "media": {
                                        "payload": chunk_payload
                                    }
                                }
                                await websocket.send_text(json.dumps(response_message))
                            
                            # Send mark to know when playback completes
                            mark_id = f"response_{uuid.uuid4().hex[:8]}"
                            mark_message = {
                                "event": "mark",
                                "streamSid": stream_sid,
                                "mark": {
                                    "name": mark_id
                                }
                            }
                            await websocket.send_text(json.dumps(mark_message))
                            print(f"DEBUG: TTS audio sent, mark={mark_id}")
                        
                        # If Gemini called end_call, wait for TTS mark instead of closing immediately
                        if should_end_call and tts_audio:
                            pending_end_call = True
                            farewell_mark_id = mark_id
                            print(f"DEBUG: Call will end after TTS finishes, mark={mark_id}")
                            logger.info("ending_call_waiting_for_farewell", 
                                       session_id=session_id, 
                                       mark_id=mark_id)
                
                elif event == "mark":
                    mark_name = message.get("mark", {}).get("name", "")
                    print(f"DEBUG: Event: mark, name={mark_name}")
                    
                    # When mark is received, AI has finished speaking
                    if mark_name.startswith("response_") or mark_name == "greeting_done":
                        await orchestrator.mark_speaking_done(session_id, db)
                        logger.info("ai_speaking_done", session_id=session_id, mark=mark_name)
                        
                        # If waiting for farewell to finish, close call now
                        if pending_end_call and mark_name == farewell_mark_id:
                            print(f"DEBUG: Farewell TTS finished ({mark_name}), ending call")
                            await orchestrator.end_call(session_id, db)
                            await websocket.close()
                            print("DEBUG: WebSocket closed, call ended")
                            break
                
                elif event == "stop":
                    print("DEBUG: Event: stop")
                    logger.info("twilio_stream_stopped", session_id=session_id, step="end")
                    await orchestrator.end_call(session_id, db)
                    break
                
                else:
                    print(f"DEBUG: Unknown event: {event}")
                    
    except WebSocketDisconnect:
        print("DEBUG: WebSocket disconnected")
        logger.info("websocket_disconnected", session_id=session_id)
        # Cleanup
        from app.db.database import async_session_factory
        async with async_session_factory() as db:
            await orchestrator.end_call(session_id, db)
    
    except Exception as e:
        print(f"DEBUG: WebSocket ERROR: {str(e)}")
        logger.error("websocket_error", error=str(e), session_id=session_id)
        await websocket.close()


@router.post("/{session_id}/dtmf")
async def handle_dtmf(
    session_id: str,
    Digits: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle DTMF input for language selection.
    """
    try:
        # Update session language based on DTMF
        language_map = {
            "1": "hi",  # Hindi
            "2": "gu",  # Gujarati
            "3": "en"   # English
        }
        
        language = language_map.get(Digits, "hi")
        
        # Update session
        session = orchestrator.active_sessions.get(session_id)
        if session:
            session.language = language
            logger.info("language_selected", session_id=session_id, language=language)
        
        return {"status": "ok", "language": language}
        
    except Exception as e:
        logger.error("dtmf_error", error=str(e))
        return {"status": "error", "message": str(e)}


@router.get("/history")
async def get_call_history(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    language: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get call history with pagination and filtering.
    """
    try:
        from sqlalchemy import select, desc, or_, func
        from app.models import Call, Transcript
        
        # Build base conditions
        conditions = []
        
        # Apply filters
        if status and status != 'all':
            # Map frontend status to backend status
            status_map = {
                "Completed": "completed",
                "Dropped": "dropped", 
                "Action Required": "escalated",
                "Active": "active"
            }
            backend_status = status_map.get(status, status.lower())
            conditions.append(Call.status == backend_status)
            
        if language and language != 'all' and language != 'All':
            # Map frontend language to backend language codes
            lang_map = {
                "Hindi": "hi",
                "Gujarati": "gu", 
                "English": "en"
            }
            backend_lang = lang_map.get(language, language.lower())
            conditions.append(Call.language == backend_lang)
            
        if search:
            search_term = f"%{search}%"
            conditions.append(
                or_(
                    Call.caller_number.ilike(search_term),
                    Call.session_id.ilike(search_term)
                )
            )
        
        # Get total count first
        count_query = select(func.count(Call.id))
        if conditions:
            count_query = count_query.where(*conditions)
        count_result = await db.execute(count_query)
        total_count = count_result.scalar() or 0
        
        # Build paginated query
        query = select(Call).order_by(desc(Call.start_time))
        if conditions:
            query = query.where(*conditions)
        query = query.limit(limit).offset(offset)
        
        result = await db.execute(query)
        calls = result.scalars().all()
        
        # Transform to API response format
        call_responses = []
        for call in calls:
            # Use stored duration_seconds if available, otherwise calculate
            duration_seconds = call.duration_seconds or 0
            if duration_seconds == 0 and call.end_time and call.start_time:
                duration_seconds = int((call.end_time - call.start_time).total_seconds())
            
            # Get intent from call metadata using helper function
            intent = _get_intent_from_metadata(call.call_metadata)
            
            # Map language codes to display names
            language_display = {
                "hi": "Hindi",
                "gu": "Gujarati", 
                "en": "English"
            }.get(call.language, "Hindi")
            
            # Map status to frontend format
            status_display = {
                "active": "Active",
                "completed": "Completed",
                "dropped": "Dropped",
                "escalated": "Action Required"
            }.get(call.status, "Completed")
            
            # Format timestamps with UTC marker for proper browser conversion
            start_time_utc = call.start_time.isoformat() + "Z" if call.start_time else None
            end_time_utc = call.end_time.isoformat() + "Z" if call.end_time else None
            
            call_responses.append({
                "id": str(call.id),
                "session_id": call.session_id,
                "caller": call.caller_number,
                "called_at": start_time_utc,
                "ended_at": end_time_utc,
                "duration_seconds": duration_seconds,
                "status": call.status,
                "intent": intent,
                "language": call.language,
                "sentiment": "neutral",  # Default, could be enhanced
                "location": "Unknown",  # Could be extracted from metadata
                # Additional fields for frontend compatibility
                "callerId": call.caller_number,
                "timestamp": start_time_utc,
                "duration": f"{duration_seconds // 60}m {duration_seconds % 60}s",
                "language_display": language_display,
                "status_display": status_display
            })
        
        return {
            "items": call_responses,
            "total": total_count,
            "page": (offset // limit) + 1,
            "page_size": limit
        }
        
    except Exception as e:
        logger.error("get_call_history_error", error=str(e))
        # Return empty result instead of raising error
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": limit
        }


@router.get("/{session_id}")
async def get_call_status(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get call status and details (active or past).
    """
    try:
        # Check active session first
        session = orchestrator.active_sessions.get(session_id)
        if session:
            # Get transcripts from conversation history
            history = orchestrator.conversation_history.get(session_id)
            transcripts = []
            if history:
                for turn in history.turns:
                    transcripts.append({
                        "role": turn["role"],
                        "text": turn.get("text", ""),
                        "timestamp": datetime.utcnow().isoformat(),  # Approximate
                        "speaker": "Caller" if turn["role"] == "user" else "AI Agent",
                        "isFinal": True,
                        "confidence": 0.9
                    })

            # Calculate duration
            duration_seconds = int((datetime.utcnow() - session.created_at).total_seconds())
            
            return {
                "id": session_id,
                "session_id": session_id,
                "sessionId": session_id,
                "caller": session.caller_number,
                "callerId": session.caller_number,
                "status": "active",
                "state": session.state.value,
                "language": session.language,
                "current_form": session.current_form,
                "confidence_scores": session.confidence_scores,
                "missing_fields": session.missing_fields,
                "transcript": transcripts,
                "transcripts": transcripts,
                "called_at": session.created_at.isoformat(),
                "calledAt": session.created_at.isoformat(),
                "timestamp": session.created_at.isoformat(),
                "duration": f"{duration_seconds // 60}m {duration_seconds % 60}s",
                "duration_seconds": duration_seconds,
                "intent": session.current_form.get("complaint_type", "General Inquiry"),
                "sentiment": "neutral",
                "extractedFields": session.current_form,
                "confidenceScores": session.confidence_scores
            }
        
        # Query database for completed call
        from app.models import Call, Transcript
        from sqlalchemy import select, or_
        from sqlalchemy.orm import selectinload
        import uuid as uuid_lib
        
        # Build query conditions
        conditions = [Call.session_id == session_id]
        
        # Try to parse session_id as UUID
        try:
            call_uuid = uuid_lib.UUID(session_id)
            conditions.append(Call.id == call_uuid)
        except (ValueError, AttributeError):
            pass  # Not a valid UUID, just search by session_id
        
        query = select(Call).options(
            selectinload(Call.transcripts),
            selectinload(Call.complaints)
        ).where(or_(*conditions))
        result = await db.execute(query)
        db_call = result.scalar_one_or_none()
        
        if db_call:
            # Sort transcripts
            sorted_transcripts = sorted(db_call.transcripts, key=lambda x: x.sequence_number)
            
            # Use stored duration_seconds if available, otherwise calculate
            duration_seconds = db_call.duration_seconds or 0
            if duration_seconds == 0 and db_call.end_time and db_call.start_time:
                duration_seconds = int((db_call.end_time - db_call.start_time).total_seconds())
            
            # IST offset (UTC+5:30)
            from datetime import timedelta
            ist_offset = timedelta(hours=5, minutes=30)
            
            transcripts = []
            for t in sorted_transcripts:
                # Convert timestamp to IST
                ts_ist = None
                if t.timestamp:
                    ts_ist = (t.timestamp + ist_offset).isoformat()
                
                # Proper speaker labels
                speaker = "Caller" if t.role == "user" else "AI Agent"
                
                # AI messages have 1.0 confidence (they're always "final")
                confidence = t.confidence if t.role == "user" else 1.0
                
                transcripts.append({
                    "role": t.role,
                    "speaker": speaker,
                    "text": t.text,
                    "timestamp": ts_ist,
                    "isFinal": t.is_final,
                    "confidence": confidence
                })
            
            return {
                "id": str(db_call.id),
                "session_id": db_call.session_id,
                "sessionId": db_call.session_id,
                "caller": db_call.caller_number,
                "callerId": db_call.caller_number,
                "status": db_call.status,
                "start_time": db_call.start_time.isoformat(),
                "called_at": db_call.start_time.isoformat(),
                "calledAt": db_call.start_time.isoformat(),
                "timestamp": db_call.start_time.isoformat(),
                "end_time": db_call.end_time.isoformat() if db_call.end_time else None,
                "duration_seconds": duration_seconds,
                "duration": f"{duration_seconds // 60}m {duration_seconds % 60}s",
                "language": db_call.language,
                "recording_url": db_call.recording_url,
                "transcript": transcripts,
                "transcripts": transcripts,
                "complaints": [
                    {
                         "ticket_id": c.ticket_id,
                         "status": c.status,
                         "type": c.complaint_type
                    }
                    for c in db_call.complaints
                ],
                "extractedFields": db_call.call_metadata or {},
                "confidenceScores": db_call.call_metadata.get("confidence_scores", {}) if db_call.call_metadata else {},
                "intent": _get_intent_from_metadata(db_call.call_metadata),
                "sentiment": "neutral"
            }
        
        raise HTTPException(status_code=404, detail="Call not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_call_status_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/escalate")
async def escalate_call(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Escalate call to human operator.
    """
    try:
        session = orchestrator.active_sessions.get(session_id)
        if not session:
            return {"status": "error", "message": "Session not found"}
        
        # Update state to escalated
        from app.services.state_machine import CallState
        orchestrator.state_machine.transition(session, CallState.ESCALATED, "manual_escalation")
        
        # Broadcast escalation event
        await orchestrator.broadcast_event(session_id, "escalation_alert", {
            "session_id": session_id,
            "reason": "manual_escalation",
            "priority": "high"
        }, db)
        
        logger.info("call_escalated", session_id=session_id)
        
        return {"status": "escalated"}
        
    except Exception as e:
        logger.error("escalate_error", error=str(e))
        return {"status": "error", "message": str(e)}


@router.post("/{session_id}/end")
async def end_call(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    End a call session.
    """
    try:
        await orchestrator.end_call(session_id, db)
        return {"status": "ended"}
        
    except Exception as e:
        logger.error("end_call_error", error=str(e))
        return {"status": "error", "message": str(e)}


@router.post("/test/simulate-call")
async def simulate_call(
    db: AsyncSession = Depends(get_db)
):
    """
    Test endpoint to simulate an incoming call for development.
    Auto-ends after 5 seconds.
    """
    try:
        import uuid
        session_id = f"test_call_{uuid.uuid4().hex[:8]}"
        caller_number = "+91 98765 43210"
        
        # Start a test call session
        session = await orchestrator.start_call(
            session_id=session_id,
            caller_number=caller_number,
            twilio_call_sid=f"test_sid_{session_id}",
            db=db
        )
        
        # Simulate some conversation events
        await asyncio.sleep(1)
        
        # Simulate transcript update
        await orchestrator.broadcast_event(session_id, "final_transcript", {
            "session_id": session_id,
            "text": "मेरे घर के सामने कचरा नहीं उठाया गया है",
            "confidence": 0.95
        }, db)
        
        await asyncio.sleep(1)
        
        # Simulate form update
        await orchestrator.broadcast_event(session_id, "form_update", {
            "session_id": session_id,
            "form": {
                "complaint_type": "missed_collection",
                "address": "123 Test Street, Alkapuri"
            },
            "missing_fields": ["contact_number"],
            "confidence": {"complaint_type": 0.92, "address": 0.88}
        }, db)
        
        await asyncio.sleep(1)
        
        # Simulate AI response
        await orchestrator.broadcast_event(session_id, "speak_action", {
            "session_id": session_id,
            "tts_text": "आपकी शिकायत दर्ज कर दी गई है। टिकट नंबर VMC-2025-00123 है।",
            "language": "hi"
        }, db)
        
        # Auto-end test call after 2 more seconds
        await asyncio.sleep(2)
        await orchestrator.end_call(session_id, db)
        logger.info("test_call_auto_ended", session_id=session_id)
        
        return {
            "status": "simulated",
            "session_id": session_id,
            "message": "Test call simulation completed and auto-ended after 5 seconds"
        }
        
    except Exception as e:
        logger.error("simulate_call_error", error=str(e))
        return {"status": "error", "message": str(e)}

