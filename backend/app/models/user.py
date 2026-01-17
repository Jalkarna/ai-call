"""
User Database Models

SQLAlchemy models and Pydantic schemas for users and authentication.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserRole(str, Enum):
    """User roles for RBAC."""
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    OPERATOR = "operator"
    VIEWER = "viewer"


class UserBase(BaseModel):
    """Base user model."""
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.OPERATOR
    zones: Optional[List[str]] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    zones: Optional[List[str]] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """User response model (excludes password)."""
    id: str
    username: str
    email: EmailStr
    full_name: Optional[str]
    role: UserRole
    zones: Optional[List[str]]
    created_at: datetime
    is_active: bool
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserInDB(UserBase):
    """User model as stored in database."""
    id: str
    hashed_password: str
    created_at: datetime
    is_active: bool = True
    last_login: Optional[datetime] = None


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # user_id
    role: UserRole
    exp: datetime


# Audit Log Models
class AuditAction(str, Enum):
    """Types of auditable actions."""
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    EXPORT = "export"
    TAKEOVER = "takeover"
    ESCALATE = "escalate"
    APPROVE = "approve"


class AuditLog(BaseModel):
    """Audit log entry."""
    id: str
    timestamp: datetime
    user_id: Optional[str]
    username: Optional[str]
    action: AuditAction
    resource_type: str  # "call", "complaint", "user", "config"
    resource_id: Optional[str]
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    
    class Config:
        from_attributes = True


"""
SQLAlchemy ORM Model Example:

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.OPERATOR)
    zones = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    assigned_complaints = relationship("ComplaintDB", back_populates="assignee")
    audit_logs = relationship("AuditLogDB", back_populates="user")


class AuditLogDB(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(SQLEnum(AuditAction))
    resource_type = Column(String)
    resource_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    
    # Relationships
    user = relationship("UserDB", back_populates="audit_logs")
"""
