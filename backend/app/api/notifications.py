"""
Notifications API - Handles notification retrieval and management
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List
from datetime import datetime
import structlog

from app.db.database import get_db
from app.models import Event

logger = structlog.get_logger()

router = APIRouter()


@router.get("")
async def get_notifications(
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent notifications/events from the system.
    """
    try:
        # Query events from database
        query = select(Event).order_by(desc(Event.timestamp)).limit(limit).offset(offset)
        result = await db.execute(query)
        events = result.scalars().all()
        
        # Transform to notification format
        notifications = []
        for event in events:
            notification_type = "system"
            if event.event_type == "escalation":
                notification_type = "escalation"
            elif event.event_type in ["call_ended", "call_started"]:
                notification_type = "success" if event.event_type == "call_ended" else "system"
            elif event.event_type == "case_created":
                notification_type = "complaint"
            
            title = _get_event_title(event.event_type)
            message = _get_event_message(event.event_type, event.payload)
            
            notifications.append({
                "id": str(event.id),
                "type": notification_type,
                "title": title,
                "message": message,
                "timestamp": event.timestamp.isoformat() if event.timestamp else None,
                "read": False,  # Could be tracked per-user in production
                "event_type": event.event_type,
                "session_id": event.session_id,
                "data": event.payload
            })
        
        return {
            "items": notifications,
            "total": len(notifications),
            "page": (offset // limit) + 1,
            "page_size": limit
        }
        
    except Exception as e:
        logger.error("get_notifications_error", error=str(e))
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": limit
        }


def _get_event_title(event_type: str) -> str:
    """Get notification title based on event type."""
    titles = {
        "call_started": "New Incoming Call",
        "call_ended": "Call Completed",
        "escalation": "Call Escalation Required",
        "case_created": "Complaint Registered",
        "form_update": "Form Updated",
        "final_transcript": "Transcript Update",
        "speak_action": "AI Response",
        "system_state": "System Status",
        "system_alert": "System Alert"
    }
    return titles.get(event_type, "System Event")


def _get_event_message(event_type: str, payload: dict) -> str:
    """Get notification message based on event type and payload."""
    if not payload:
        return "Event occurred"
    
    if event_type == "call_started":
        caller = payload.get("caller", payload.get("callerId", "Unknown"))
        return f"Incoming call from {caller}"
    
    elif event_type == "call_ended":
        session_id = payload.get("session_id", "Unknown")
        duration = payload.get("duration_seconds", 0)
        return f"Call {session_id[:12] if len(session_id) > 12 else session_id} ended. Duration: {duration // 60}m {duration % 60}s"
    
    elif event_type == "escalation":
        reason = payload.get("reason", "User requested assistance")
        return f"Escalation required: {reason}"
    
    elif event_type == "case_created":
        ticket_id = payload.get("ticket_id", "Unknown")
        return f"Ticket {ticket_id} has been created successfully"
    
    elif event_type == "form_update":
        session_id = payload.get("session_id", "")
        return f"Form data updated for call {session_id[:12] if len(session_id) > 12 else session_id}"
    
    else:
        return str(payload)[:100]
