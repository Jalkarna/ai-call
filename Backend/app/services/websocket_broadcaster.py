"""
WebSocket Broadcaster Service

Manages WebSocket connections for real-time dashboard updates with:
- Connection management
- Event broadcasting
- Session-specific messaging
"""

from fastapi import WebSocket
from typing import Optional
import asyncio
import json
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(str, Enum):
    """Types of events that can be broadcast."""
    CALL_STARTED = "call_started"
    CALL_UPDATED = "call_updated"
    CALL_ENDED = "call_ended"
    TRANSCRIPT_UPDATE = "transcript_update"
    FORM_UPDATE = "form_update"
    COMPLAINT_CREATED = "complaint_created"
    COMPLAINT_UPDATED = "complaint_updated"
    ESCALATION = "escalation"
    SYSTEM_ALERT = "system_alert"


@dataclass
class WebSocketEvent:
    """Event structure for WebSocket messages."""
    type: EventType
    session_id: str
    timestamp: str
    data: dict
    
    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "data": self.data
        })


class ConnectionManager:
    """
    Manages WebSocket connections for the dashboard.
    
    Handles connection lifecycle and message broadcasting.
    """
    
    def __init__(self):
        # All active connections
        self.active_connections: list[WebSocket] = []
        
        # Connections subscribed to specific sessions
        self.session_subscriptions: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: Optional[str] = None):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if session_id:
            if session_id not in self.session_subscriptions:
                self.session_subscriptions[session_id] = []
            self.session_subscriptions[session_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from session subscriptions
        for session_id, connections in self.session_subscriptions.items():
            if websocket in connections:
                connections.remove(websocket)
    
    async def broadcast(self, event: WebSocketEvent):
        """Broadcast an event to all connected clients."""
        message = event.to_json()
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def send_to_session(self, session_id: str, event: WebSocketEvent):
        """Send an event to clients subscribed to a specific session."""
        if session_id not in self.session_subscriptions:
            return
        
        message = event.to_json()
        disconnected = []
        
        for connection in self.session_subscriptions[session_id]:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def send_personal(self, websocket: WebSocket, event: WebSocketEvent):
        """Send an event to a specific client."""
        try:
            await websocket.send_text(event.to_json())
        except Exception:
            self.disconnect(websocket)
    
    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)
    
    def get_session_subscribers(self, session_id: str) -> int:
        """Get the number of subscribers for a session."""
        return len(self.session_subscriptions.get(session_id, []))


# Event factory functions
def create_call_event(
    event_type: EventType,
    session_id: str,
    data: dict
) -> WebSocketEvent:
    """Create a call-related event."""
    return WebSocketEvent(
        type=event_type,
        session_id=session_id,
        timestamp=datetime.utcnow().isoformat() + "Z",
        data=data
    )


def create_form_update_event(
    session_id: str,
    form: dict,
    changes: list[dict]
) -> WebSocketEvent:
    """Create a form update event for the dashboard."""
    return WebSocketEvent(
        type=EventType.FORM_UPDATE,
        session_id=session_id,
        timestamp=datetime.utcnow().isoformat() + "Z",
        data={
            "form": form,
            "changes": changes
        }
    )


def create_transcript_event(
    session_id: str,
    text: str,
    speaker: str,
    is_final: bool = True
) -> WebSocketEvent:
    """Create a transcript update event."""
    return WebSocketEvent(
        type=EventType.TRANSCRIPT_UPDATE,
        session_id=session_id,
        timestamp=datetime.utcnow().isoformat() + "Z",
        data={
            "text": text,
            "speaker": speaker,
            "is_final": is_final
        }
    )


# Singleton instance
manager = ConnectionManager()
