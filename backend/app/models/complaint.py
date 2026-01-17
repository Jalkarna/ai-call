"""
Complaint Database Models

SQLAlchemy models and Pydantic schemas for complaints.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class ComplaintStatus(str, Enum):
    """Status of a complaint."""
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    REJECTED = "Rejected"


class UrgencyLevel(str, Enum):
    """Urgency level of a complaint."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class ComplaintCategory(str, Enum):
    """Categories of municipal complaints."""
    GARBAGE_COLLECTION = "Garbage Collection"
    STREETLIGHT = "Streetlight Issue"
    WATER_SUPPLY = "Water Supply"
    DRAINAGE = "Drainage/Sewage"
    ROAD_REPAIR = "Road Repair"
    STRAY_ANIMAL = "Stray Animal"
    ENCROACHMENT = "Illegal Encroachment"
    OTHER = "Other"


# Pydantic Models
class ComplaintBase(BaseModel):
    """Base complaint model with common fields."""
    category: str
    description: str
    location: str
    contact_number: Optional[str] = None
    pincode: Optional[str] = None
    landmark: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    """Schema for creating a new complaint."""
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    source_call_id: Optional[str] = None
    confidence_scores: Optional[dict] = None


class ComplaintUpdate(BaseModel):
    """Schema for updating a complaint."""
    status: Optional[ComplaintStatus] = None
    urgency: Optional[UrgencyLevel] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class ComplaintResponse(BaseModel):
    """Full complaint response model."""
    id: str
    ticket_number: str
    category: str
    description: str
    location: str
    contact_number: Optional[str] = None
    pincode: Optional[str] = None
    landmark: Optional[str] = None
    status: ComplaintStatus
    urgency: UrgencyLevel
    created_at: datetime
    updated_at: datetime
    assigned_to: Optional[str] = None
    source_call_id: Optional[str] = None
    confidence_scores: Optional[dict] = None
    resolution_notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class ComplaintListItem(BaseModel):
    """Simplified complaint for list views."""
    id: str
    ticket_number: str
    category: str
    location: str
    status: ComplaintStatus
    urgency: UrgencyLevel
    created_at: datetime
    assigned_to: Optional[str] = None


class ComplaintTimeline(BaseModel):
    """Timeline entry for complaint history."""
    timestamp: datetime
    action: str
    actor: str  # "system", "ai", or user_id
    details: Optional[str] = None


class ComplaintDetailResponse(ComplaintResponse):
    """Detailed complaint with timeline and linked call."""
    timeline: List[ComplaintTimeline] = []
    linked_call: Optional[dict] = None


class FieldConfidence(BaseModel):
    """Confidence score for an extracted field."""
    field: str
    value: str
    confidence: float = Field(ge=0, le=1)
    source: str = "ai"  # "ai" or "operator"


class ExtractedFields(BaseModel):
    """AI-extracted fields with confidence scores."""
    address: Optional[FieldConfidence] = None
    contact_number: Optional[FieldConfidence] = None
    pincode: Optional[FieldConfidence] = None
    category: Optional[FieldConfidence] = None
    description: Optional[FieldConfidence] = None


# Statistics Models
class ComplaintStats(BaseModel):
    """Aggregate statistics for complaints."""
    total: int
    by_status: dict
    by_urgency: dict
    by_category: dict
    today_count: int
    resolved_today: int
    average_resolution_hours: float
    escalation_rate: float


"""
SQLAlchemy ORM Model Example:

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ComplaintDB(Base):
    __tablename__ = "complaints"
    
    id = Column(String, primary_key=True)
    ticket_number = Column(String, unique=True, index=True)
    category = Column(String)
    description = Column(Text)
    location = Column(String, index=True)
    contact_number = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    landmark = Column(String, nullable=True)
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.OPEN)
    urgency = Column(SQLEnum(UrgencyLevel), default=UrgencyLevel.MEDIUM)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    source_call_id = Column(String, ForeignKey("call_logs.id"), nullable=True)
    confidence_scores = Column(JSON, default=dict)
    resolution_notes = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    call = relationship("CallLogDB", back_populates="complaint")
    assignee = relationship("UserDB", back_populates="assigned_complaints")
    timeline = relationship("ComplaintTimelineDB", back_populates="complaint")
"""
