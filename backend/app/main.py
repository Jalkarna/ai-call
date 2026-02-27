"""
VMC Voice AI - Main Application Entry Point

AI-driven municipal call center for Vadodara Municipal Corporation.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Import routers
from app.api import calls, complaints, admin, notifications, ivr
from app.db.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    logger.info("application_starting", name="VMC Voice AI Backend")
    
    # Initialize database
    try:
        await init_db()
        logger.info("database_initialized")
    except Exception as e:
        logger.error("database_initialization_failed", error=str(e))
    
    yield
    
    # Shutdown
    logger.info("application_shutting_down")
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="VMC Voice AI",
    description="AI-driven municipal call center backend for Vadodara Municipal Corporation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
# Strip whitespace and filter empty strings from origins
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

# In development mode, allow common development origins
is_development = os.getenv("APP_ENV", "development") == "development"

if is_development:
    # Add common development origins
    dev_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    cors_origins = list(set(cors_origins + dev_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight for 10 minutes
)

# Include API routers
app.include_router(calls.router, prefix="/api/calls", tags=["Calls"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(ivr.router, prefix="/api/ivr", tags=["IVR"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "VMC Voice AI Backend",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint."""
    # Check service availability
    services_status = {}
    
    # Check Gemini
    try:
        from app.services.gemini_client import get_gemini_client
        gemini = get_gemini_client()
        services_status["gemini"] = "ready" if gemini.api_key else "no_api_key"
    except Exception as e:
        services_status["gemini"] = f"error: {str(e)}"
    
    # Check Sarvam STT
    try:
        from app.services.stt_client import get_sarvam_stt_client
        stt = get_sarvam_stt_client()
        services_status["sarvam_stt"] = "ready" if stt.api_key else "no_api_key"
    except Exception as e:
        services_status["sarvam_stt"] = f"error: {str(e)}"
    
    # Check Sarvam TTS
    try:
        from app.services.tts_client import get_sarvam_tts_client
        tts = get_sarvam_tts_client()
        services_status["sarvam_tts"] = "ready" if tts.api_key else "no_api_key"
    except Exception as e:
        services_status["sarvam_tts"] = f"error: {str(e)}"
    
    # Check Twilio (just check env vars)
    twilio_configured = bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"))
    services_status["twilio"] = "ready" if twilio_configured else "not_configured"
    
    # Database
    # Database
    try:
        from app.db.database import async_session_factory
        from sqlalchemy import text
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        services_status["database"] = "connected"
    except Exception as e:
        services_status["database"] = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "services": services_status
    }


# WebSocket endpoint for dashboard
from fastapi import WebSocket, WebSocketDisconnect
from app.services.websocket_broadcaster import get_connection_manager

ws_manager = get_connection_manager()


@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket endpoint for dashboard to receive real-time events.
    """
    await ws_manager.connect(websocket)
    logger.info("dashboard_websocket_connected")
    
    import asyncio
    import json
    
    async def send_heartbeat():
        """Send periodic heartbeat to keep connection alive."""
        while True:
            try:
                await asyncio.sleep(30)  # Heartbeat every 30 seconds
                await websocket.send_text(json.dumps({
                    "type": "heartbeat",
                    "timestamp": __import__('datetime').datetime.utcnow().isoformat()
                }))
            except:
                break
    
    # Start heartbeat task
    heartbeat_task = asyncio.create_task(send_heartbeat())
    
    try:
        while True:
            # Keep connection alive and receive any client messages
            data = await websocket.receive_text()
            # Handle ping/pong from client
            if data == "ping":
                await websocket.send_text("pong")
            
    except WebSocketDisconnect:
        heartbeat_task.cancel()
        ws_manager.disconnect(websocket)
        logger.info("dashboard_websocket_disconnected")


@app.websocket("/ws/call/{session_id}")
async def websocket_call_room(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for specific call session monitoring.
    """
    await ws_manager.connect(websocket, room=session_id)
    logger.info("call_room_websocket_connected", session_id=session_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle any client messages for this call
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, room=session_id)
        logger.info("call_room_websocket_disconnected", session_id=session_id)
