"""
Call Management API Endpoints

Handles Twilio webhooks, call session management, and call log retrieval.
"""

from fastapi import APIRouter, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

from app.models.call import CallLog, CallSession, CallStatus
from app.services.websocket_broadcaster import ConnectionManager

router = APIRouter()
manager = ConnectionManager()


class CallStartResponse(BaseModel):
    session_id: str
    status: str


class CallLogResponse(BaseModel):
    id: str
    session_id: str
    caller: str
    location: Optional[str]
    called_at: datetime
    duration_seconds: Optional[int]
    status: CallStatus
    intent: Optional[str]
    language: Optional[str]
    sentiment: Optional[str]
    transcript: Optional[str]


@router.post("/start")
async def call_start(request: Request):
    """
    Twilio webhook endpoint for incoming calls.
    
    This endpoint is called when a new call comes in. It:
    1. Creates a session in Redis
    2. Persists call metadata to the database
    3. Returns TwiML to start the audio stream
    """
    data = await request.form()
    call_sid = data.get("CallSid")
    from_number = data.get("From")
    to_number = data.get("To")
    
    session_id = f"call_{call_sid}"
    
    # TODO: Persist call session to database
    # TODO: Create session in Redis for state management
    
    # Return TwiML to accept audio stream
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say>Namaste. Welcome to Vadodara Municipal Corporation. Please wait while we connect you.</Say>
        <Start>
            <Stream url="wss://your-orchestrator.example.com/api/calls/stream/{session_id}" />
        </Start>
        <Pause length="60"/>
    </Response>
    """
    
    return Response(content=twiml, media_type="application/xml")


@router.websocket("/stream/{session_id}")
async def call_stream(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for Twilio Media Streams.
    
    Handles real-time audio streaming from Twilio and orchestrates:
    1. Audio buffering and VAD
    2. STT processing via Whisper
    3. Intent extraction via Gemini
    4. TTS response via Sarvam AI
    """
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            event_type = message.get("event")
            
            if event_type == "connected":
                print(f"Stream connected for session: {session_id}")
                
            elif event_type == "start":
                # Stream metadata received
                stream_sid = message.get("streamSid")
                print(f"Stream started: {stream_sid}")
                
            elif event_type == "media":
                # Audio payload received
                # TODO: Buffer audio, run VAD, process with STT
                payload = message.get("media", {}).get("payload")
                # Process audio chunk...
                
            elif event_type == "stop":
                print(f"Stream stopped for session: {session_id}")
                break
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session: {session_id}")


@router.get("/", response_model=List[CallLogResponse])
async def list_calls(
    skip: int = 0,
    limit: int = 20,
    status: Optional[CallStatus] = None
):
    """
    Retrieve paginated list of call logs.
    
    Supports filtering by status and pagination.
    """
    # TODO: Fetch from database
    return []


@router.get("/{call_id}", response_model=CallLogResponse)
async def get_call(call_id: str):
    """
    Retrieve details of a specific call.
    
    Returns full call metadata including transcript and extracted fields.
    """
    # TODO: Fetch from database
    raise HTTPException(status_code=404, detail="Call not found")


@router.post("/{call_id}/takeover")
async def human_takeover(call_id: str):
    """
    Initiate human takeover for an active call.
    
    This pauses AI processing and connects the call to a human operator.
    """
    # TODO: Implement takeover logic
    return {"status": "takeover_initiated", "call_id": call_id}


@router.post("/{call_id}/escalate")
async def escalate_call(call_id: str, reason: Optional[str] = None):
    """
    Escalate a call for supervisor review.
    """
    # TODO: Implement escalation logic
    return {"status": "escalated", "call_id": call_id, "reason": reason}


@router.websocket("/live")
async def live_calls_feed(websocket: WebSocket):
    """
    WebSocket endpoint for dashboard live updates.
    
    Streams real-time call events to connected dashboard clients.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, actual events are pushed by other services
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
