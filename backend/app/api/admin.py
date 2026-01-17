"""
Admin API - System configuration, stats, and human takeover
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta

import structlog

from app.db.database import get_db
from app.models import Call, Complaint, User
from app.services.call_orchestrator import get_call_orchestrator

logger = structlog.get_logger()

router = APIRouter()
orchestrator = get_call_orchestrator()


class SystemConfig(BaseModel):
    confidence_threshold_high: float = 0.8
    confidence_threshold_medium: float = 0.7
    max_clarification_attempts: int = 2
    inactivity_timeout_seconds: int = 300
    enable_consent_announcement: bool = True
    enable_call_recording: bool = True


@router.post("/takeover/{session_id}")
async def takeover_call(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Human operator takes over an AI call.
    """
    try:
        session = orchestrator.active_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Transition to escalated state
        from app.services.state_machine import CallState
        orchestrator.state_machine.transition(session, CallState.ESCALATED, "operator_takeover")
        
        # Broadcast takeover event
        await orchestrator.broadcast_event(session_id, "operator_takeover", {
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "reason": "manual_takeover"
        }, db)
        
        logger.info("operator_takeover", session_id=session_id)
        
        return {
            "status": "takeover_initiated",
            "session_id": session_id,
            "current_form": session.current_form,
            "conversation_history": orchestrator.conversation_history.get(session_id).turns if session_id in orchestrator.conversation_history else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("takeover_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats(
    time_range: str = "24h",
    db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard statistics.
    """
    try:
        # Calculate time range
        if time_range == "24h":
            since = datetime.utcnow() - timedelta(hours=24)
        elif time_range == "7d":
            since = datetime.utcnow() - timedelta(days=7)
        elif time_range == "30d":
            since = datetime.utcnow() - timedelta(days=30)
        else:
            since = datetime.utcnow() - timedelta(hours=24)
        
        # Total calls
        total_calls_query = select(func.count(Call.id)).where(Call.start_time >= since)
        total_calls_result = await db.execute(total_calls_query)
        total_calls = total_calls_result.scalar()
        
        # Completed calls
        completed_calls_query = select(func.count(Call.id)).where(
            Call.start_time >= since,
            Call.status == 'completed'
        )
        completed_calls_result = await db.execute(completed_calls_query)
        completed_calls = completed_calls_result.scalar()
        
        # Escalated calls
        escalated_calls_query = select(func.count(Call.id)).where(
            Call.start_time >= since,
            Call.status == 'escalated'
        )
        escalated_calls_result = await db.execute(escalated_calls_query)
        escalated_calls = escalated_calls_result.scalar()
        
        # Filed complaints
        filed_complaints_query = select(func.count(Complaint.id)).where(
            Complaint.created_at >= since
        )
        filed_complaints_result = await db.execute(filed_complaints_query)
        filed_complaints = filed_complaints_result.scalar()
        
        # Average call duration
        avg_duration_query = select(func.avg(Call.duration_seconds)).where(
            Call.start_time >= since,
            Call.duration_seconds.isnot(None)
        )
        avg_duration_result = await db.execute(avg_duration_query)
        avg_duration = avg_duration_result.scalar() or 0
        
        # Automated filing rate
        automated_rate = (filed_complaints / total_calls * 100) if total_calls > 0 else 0
        
        # Escalation rate
        escalation_rate = (escalated_calls / total_calls * 100) if total_calls > 0 else 0
        
        # Format avg duration for display
        avg_minutes = int(avg_duration // 60)
        avg_seconds = int(avg_duration % 60)
        avg_duration_formatted = f"{avg_minutes}m {avg_seconds}s"
        
        return {
            "time_range": time_range,
            "total_calls": total_calls,
            "completed_calls": completed_calls,
            "escalated_calls": escalated_calls,
            "filed_complaints": filed_complaints,
            "avg_call_duration_seconds": round(avg_duration, 2),
            "avg_call_duration": avg_duration_formatted,
            "automated_filing_rate": round(automated_rate, 2),
            "escalation_rate": round(escalation_rate, 2),
            "active_calls": len(orchestrator.active_sessions)
        }
        
    except Exception as e:
        logger.error("get_stats_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_config():
    """
    Get current system configuration.
    """
    try:
        # Return current configuration
        from app.services.state_machine import get_state_machine
        sm = get_state_machine()
        
        return {
            "confidence_threshold_high": sm.CONFIDENCE_HIGH,
            "confidence_threshold_medium": sm.CONFIDENCE_MEDIUM,
            "max_clarification_attempts": 2,
            "inactivity_timeout_seconds": 300,
            "enable_consent_announcement": True,
            "enable_call_recording": True
        }
        
    except Exception as e:
        logger.error("get_config_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config")
async def update_config(config: SystemConfig):
    """
    Update system configuration.
    """
    try:
        # In production: persist to database
        # For now, just validate and return
        
        logger.info("config_updated", config=config.dict())
        
        return {
            "status": "updated",
            "config": config.dict()
        }
        
    except Exception as e:
        logger.error("update_config_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active-calls")
async def get_active_calls():
    """
    Get list of active call sessions.
    """
    try:
        active = []
        for session_id, session in orchestrator.active_sessions.items():
            active.append({
                "session_id": session_id,
                "state": session.state.value,
                "language": session.language,
                "caller_number": session.caller_number,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat(),
                "current_form": session.current_form,
                "missing_fields": session.missing_fields
            })
        
        return {"active_calls": active, "count": len(active)}
        
    except Exception as e:
        logger.error("get_active_calls_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
