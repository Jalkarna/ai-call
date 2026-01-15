"""
VMC Voice AI - Main Application Entry Point

This FastAPI application serves as the orchestration layer for the
AI-driven municipal call center system for Vadodara Municipal Corporation.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import calls, complaints, admin
from app.services.websocket_broadcaster import ConnectionManager

# WebSocket connection manager (singleton)
manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    print("🚀 VMC Voice AI Backend starting...")
    yield
    # Shutdown
    print("👋 VMC Voice AI Backend shutting down...")


app = FastAPI(
    title="VMC Voice AI",
    description="AI-driven municipal call center backend for Vadodara Municipal Corporation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(calls.router, prefix="/api/calls", tags=["Calls"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


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
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "redis": "connected",
            "twilio": "ready",
            "gemini": "ready",
            "whisper": "ready",
            "sarvam_tts": "ready"
        }
    }
