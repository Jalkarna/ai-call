"""
Call Database Models

SQLAlchemy models for call sessions, logs, and transcripts.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SQLEnum, JSON, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel


class CallStatus(str, Enum):
    """Status of a call."""
    PROCESSING = "processing"
    REGISTERED = "registered"
    ESCALATED = "escalated"
    FAILED = "failed"
    PENDING = "pending"
    DROPPED = "dropped"


class SentimentType(str, Enum):
    """Detected caller sentiment."""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    FRUSTRATED = "frustrated"


# Pydantic Models for API
class CallLog(BaseModel):
    """Call log entry for API responses."""
    id: str
    session_id: str
    caller: str
    location: Optional[str] = None
    called_at: datetime
    duration_seconds: Optional[int] = None
    status: CallStatus
    intent: Optional[str] = None
    language: Optional[str] = None
    sentiment: Optional[SentimentType] = None
    
    class Config:
        from_attributes = True


class CallSession(BaseModel):
    """Active call session data."""
    session_id: str
    call_sid: str
    caller_number: str
    started_at: datetime
    language: str = "hi"
    state: str = "idle"
    form_data: dict = {}
    transcript: List[dict] = []
    
    class Config:
        from_attributes = True


class TranscriptEntry(BaseModel):
    """Single transcript entry."""
    timestamp: datetime
    speaker: str  # "user" or "ai"
    text: str
    is_final: bool = True
    confidence: Optional[float] = None


class CallDetailResponse(BaseModel):
    """Detailed call response including transcript."""
    id: str
    session_id: str
    caller: str
    location: Optional[str]
    called_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    status: CallStatus
    intent: Optional[str]
    language: Optional[str]
    sentiment: Optional[SentimentType]
    transcript: List[TranscriptEntry]
    extracted_fields: dict
    confidence_scores: dict
    recording_url: Optional[str]
    linked_complaint_id: Optional[str]


class FormUpdateEvent(BaseModel):
    """Event for real-time form updates."""
    session_id: str
    form: dict
    changes: List[dict]
    timestamp: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "call_20250115_00001",
                "form": {
                    "complaint_type": "missed_collection",
                    "address": "12 MG Road, Sayajiganj"
                },
                "changes": [
                    {
                        "field": "address",
                        "from": None,
                        "to": "12 MG Road, Sayajiganj",
                        "confidence": 0.92
                    }
                ],
                "timestamp": "2025-01-15T09:53:25+05:30"
            }
        }


# SQLAlchemy ORM Models (for actual database)
"""
Example SQLAlchemy model definition:

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class CallLogDB(Base):
    __tablename__ = "call_logs"
    
    id = Column(String, primary_key=True)
    session_id = Column(String, unique=True, index=True)
    caller_number = Column(String, index=True)
    location = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(SQLEnum(CallStatus), default=CallStatus.PROCESSING)
    intent = Column(String, nullable=True)
    language = Column(String, default="hi")
    sentiment = Column(SQLEnum(SentimentType), nullable=True)
    transcript = Column(JSON, default=list)
    extracted_fields = Column(JSON, default=dict)
    confidence_scores = Column(JSON, default=dict)
    recording_url = Column(String, nullable=True)
    linked_complaint_id = Column(String, ForeignKey("complaints.id"), nullable=True)
    
    # Relationships
    complaint = relationship("ComplaintDB", back_populates="call")
"""
