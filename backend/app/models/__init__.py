"""
SQLAlchemy database models for VMC AI Call Center
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, TIMESTAMP, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

Base = declarative_base()


class Call(Base):
    """Represents a call session."""
    __tablename__ = 'calls'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    caller_number = Column(String(20), nullable=False, index=True)
    twilio_call_sid = Column(String(255), index=True)
    language = Column(String(10), default='hi')
    status = Column(String(20), default='active', index=True)
    current_state = Column(String(20), default='init')
    start_time = Column(TIMESTAMP, nullable=False, default=func.now(), index=True)
    end_time = Column(TIMESTAMP)
    duration_seconds = Column(Integer)
    recording_url = Column(Text)
    call_metadata = Column(JSON, default={})
    created_at = Column(TIMESTAMP, nullable=False, default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, default=func.now(), onupdate=func.now())
    
    # Relationships
    complaints = relationship("Complaint", back_populates="call")
    transcripts = relationship("Transcript", back_populates="call", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="call", cascade="all, delete-orphan")


class Complaint(Base):
    """Represents a citizen complaint."""
    __tablename__ = 'complaints'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID(as_uuid=True), ForeignKey('calls.id', ondelete='SET NULL'), index=True)
    ticket_id = Column(String(50), unique=True, nullable=False, index=True)
    complaint_type = Column(String(50), nullable=False, index=True)
    description = Column(Text)
    address = Column(Text, nullable=False)
    locality = Column(String(255))
    pincode = Column(String(10), index=True)
    contact_number = Column(String(255))  # Encrypted
    landmark = Column(String(255))
    urgency = Column(String(20), default='medium')
    status = Column(String(30), default='registered', index=True)
    confidence_scores = Column(JSON, default={})
    assigned_to = Column(UUID(as_uuid=True))
    created_at = Column(TIMESTAMP, nullable=False, default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, nullable=False, default=func.now(), onupdate=func.now())
    resolved_at = Column(TIMESTAMP)
    
    # Relationships  
    call = relationship("Call", back_populates="complaints")


class Transcript(Base):
    """Represents conversation transcripts."""
    __tablename__ = 'transcripts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID(as_uuid=True), ForeignKey('calls.id', ondelete='CASCADE'), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    role = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    language = Column(String(10))
    confidence = Column(Float)
    is_final = Column(Boolean, default=False)
    timestamp = Column(TIMESTAMP, nullable=False, default=func.now(), index=True)
    
    # Relationships
    call = relationship("Call", back_populates="transcripts")


class Event(Base):
    """Represents system events for dashboard."""
    __tablename__ = 'events'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID(as_uuid=True), ForeignKey('calls.id', ondelete='CASCADE'), index=True)
    event_type = Column(String(50), nullable=False, index=True)
    event_data = Column(JSON, nullable=False, default={})
    timestamp = Column(TIMESTAMP, nullable=False, default=func.now(), index=True)
    
    # Relationships
    call = relationship("Call", back_populates="events")


class User(Base):
    """Represents admin/operator users."""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), default='viewer', index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, nullable=False, default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, default=func.now(), onupdate=func.now())
    last_login = Column(TIMESTAMP)


class AuditLog(Base):
    """Represents audit trail."""
    __tablename__ = 'audit_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(255))
    changes = Column(JSON, default={})
    ip_address = Column(INET)
    user_agent = Column(Text)
    timestamp = Column(TIMESTAMP, nullable=False, default=func.now(), index=True)
