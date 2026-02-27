"""
Complaints API - Manage complaints and tickets
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

import structlog

from app.db.database import get_db
from app.models import Complaint, Call

logger = structlog.get_logger()

router = APIRouter()

# Mock employee mapping (UUID -> Name)
EMPLOYEE_NAMES = {
    "e1a2b3c4-5d6e-7f8a-9012-1a2b3c4d5e6f": "Rajesh Kumar",
    "f2b3c4d5-6e7f-8901-2345-2b3c4d5e6f7a": "Priya Shah",
    "a3c4d5e6-7f89-0123-4567-3c4d5e6f7a8b": "Amit Patel",
    "b4d5e6f7-8901-2345-6789-4d5e6f7a8b9c": "Neha Desai",
    "c5e6f7a8-9012-3456-789a-5e6f7a8b9c0d": "Vikram Singh",
}


def complaint_to_response(complaint) -> dict:
    """Convert SQLAlchemy Complaint object to response dictionary."""
    # Debug logging
    logger.info("complaint_to_response", complaint_id=str(complaint.id), call_id=str(complaint.call_id) if complaint.call_id else None)
    
    # Get employee name from UUID
    assigned_to_name = None
    if complaint.assigned_to:
        assigned_to_name = EMPLOYEE_NAMES.get(str(complaint.assigned_to), f"Employee {str(complaint.assigned_to)[:8]}")
    
    return {
        "id": str(complaint.id),
        "ticket_id": complaint.ticket_id,
        "complaint_type": complaint.complaint_type,
        "description": complaint.description,
        "address": complaint.address,
        "locality": complaint.locality,
        "pincode": complaint.pincode,
        "contact_number": complaint.contact_number,
        "landmark": complaint.landmark,
        "urgency": complaint.urgency,
        "status": complaint.status,
        "confidence_scores": complaint.confidence_scores or {},
        "created_at": complaint.created_at,
        "updated_at": complaint.updated_at,
        "source_call_id": str(complaint.call_id) if complaint.call_id else None,
        "assigned_to": str(complaint.assigned_to) if complaint.assigned_to else None,
        "assigned_to_name": assigned_to_name
    }


# Pydantic models for API
class ComplaintCreate(BaseModel):
    complaint_type: str
    description: Optional[str] = None
    address: str
    locality: Optional[str] = None
    pincode: Optional[str] = None
    contact_number: str
    landmark: Optional[str] = None
    urgency: str = "medium"


class ComplaintUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: str
    ticket_id: str
    complaint_type: str
    description: Optional[str]
    address: str
    locality: Optional[str]
    pincode: Optional[str]
    contact_number: Optional[str]  # Made optional since it can be null
    landmark: Optional[str]
    urgency: str
    status: str
    confidence_scores: dict
    created_at: datetime
    updated_at: datetime
    source_call_id: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.post("", response_model=ComplaintResponse, status_code=201)
async def create_complaint(
    complaint_data: ComplaintCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new complaint manually or from automated system.
    """
    try:
        # Generate ticket ID
        year = datetime.utcnow().year
        # Query for next sequence number
        result = await db.execute(
            select(Complaint).where(
                Complaint.ticket_id.like(f"VMC-{year}-%")
            ).order_by(Complaint.created_at.desc()).limit(1)
        )
        last_complaint = result.scalar_one_or_none()
        
        if last_complaint and last_complaint.ticket_id:
            last_seq = int(last_complaint.ticket_id.split('-')[-1])
            sequence = last_seq + 1
        else:
            sequence = 1
        
        ticket_id = f"VMC-{year}-{sequence:05d}"
        
        # Create complaint
        complaint = Complaint(
            ticket_id=ticket_id,
            complaint_type=complaint_data.complaint_type,
            description=complaint_data.description,
            address=complaint_data.address,
            locality=complaint_data.locality,
            pincode=complaint_data.pincode,
            contact_number=complaint_data.contact_number,
            landmark=complaint_data.landmark,
            urgency=complaint_data.urgency,
            status='registered'
        )
        
        db.add(complaint)
        await db.commit()
        await db.refresh(complaint)
        
        logger.info("complaint_created", ticket_id=ticket_id)
        
        return complaint_to_response(complaint)
        
    except Exception as e:
        logger.error("create_complaint_error", error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[ComplaintResponse])
async def list_complaints(
    status: Optional[str] = Query(None),
    complaint_type: Optional[str] = Query(None),
    pincode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    List and filter complaints with pagination.
    """
    try:
        # Build query
        query = select(Complaint)
        conditions = []
        
        if status:
            conditions.append(Complaint.status == status)
        if complaint_type:
            conditions.append(Complaint.complaint_type == complaint_type)
        if pincode:
            conditions.append(Complaint.pincode == pincode)
        if search:
            # Search in ticket_id, address, or description
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Complaint.ticket_id.ilike(search_pattern),
                    Complaint.address.ilike(search_pattern),
                    Complaint.description.ilike(search_pattern)
                )
            )
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Apply pagination and ordering
        query = query.order_by(Complaint.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        complaints = result.scalars().all()
        
        # Convert to response format (UUID to string, handle None values)
        return [complaint_to_response(c) for c in complaints]
        
    except Exception as e:
        logger.error("list_complaints_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get complaint details by ID or ticket ID.
    """
    try:
        # Try UUID first, then ticket_id with join to get call session_id
        query = select(Complaint, Call.session_id).outerjoin(
            Call, Complaint.call_id == Call.id
        ).where(
            or_(
                Complaint.id == complaint_id,
                Complaint.ticket_id == complaint_id
            )
        )
        
        result = await db.execute(query)
        row = result.one_or_none()
        
        if not row:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        complaint, session_id = row
        
        # Return response with session_id included
        response = complaint_to_response(complaint)
        if session_id:
            response["session_id"] = session_id
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_complaint_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: str,
    update_data: ComplaintUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update complaint (operator corrections, status updates).
    """
    try:
        # Find complaint
        query = select(Complaint).where(
            or_(
                Complaint.id == complaint_id,
                Complaint.ticket_id == complaint_id
            )
        )
        
        result = await db.execute(query)
        complaint = result.scalar_one_or_none()
        
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        # Update fields
        if update_data.description is not None:
            complaint.description = update_data.description
        if update_data.status is not None:
            complaint.status = update_data.status
            if update_data.status == 'resolved':
                complaint.resolved_at = datetime.utcnow()
        if update_data.assigned_to is not None:
            complaint.assigned_to = update_data.assigned_to
        
        await db.commit()
        await db.refresh(complaint)
        
        logger.info("complaint_updated", ticket_id=complaint.ticket_id)
        
        return complaint_to_response(complaint)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_complaint_error", error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{complaint_id}")
async def delete_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a complaint (admin only).
    """
    try:
        query = select(Complaint).where(
            or_(
                Complaint.id == complaint_id,
                Complaint.ticket_id == complaint_id
            )
        )
        
        result = await db.execute(query)
        complaint = result.scalar_one_or_none()
        
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        await db.delete(complaint)
        await db.commit()
        
        logger.info("complaint_deleted", ticket_id=complaint.ticket_id)
        
        return {"status": "deleted", "ticket_id": complaint.ticket_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_complaint_error", error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/assign-employees")
async def assign_employees_to_complaints(
    db: AsyncSession = Depends(get_db)
):
    """
    Admin endpoint: Assign random employees to all unassigned complaints.
    """
    try:
        import random
        import uuid as uuid_lib
        
        # Mock employee pool
        MOCK_EMPLOYEES = [
            uuid_lib.UUID("e1a2b3c4-5d6e-7f8a-9012-1a2b3c4d5e6f"),  # Rajesh Kumar
            uuid_lib.UUID("f2b3c4d5-6e7f-8901-2345-2b3c4d5e6f7a"),  # Priya Shah
            uuid_lib.UUID("a3c4d5e6-7f89-0123-4567-3c4d5e6f7a8b"),  # Amit Patel
            uuid_lib.UUID("b4d5e6f7-8901-2345-6789-4d5e6f7a8b9c"),  # Neha Desai
            uuid_lib.UUID("c5e6f7a8-9012-3456-789a-5e6f7a8b9c0d"),  # Vikram Singh
        ]
        
        # Get all unassigned complaints
        query = select(Complaint).where(Complaint.assigned_to == None)
        result = await db.execute(query)
        complaints = result.scalars().all()
        
        if not complaints:
            return {"status": "success", "message": "No unassigned complaints found", "assigned_count": 0}
        
        # Assign each complaint
        assigned_count = 0
        for complaint in complaints:
            complaint.assigned_to = random.choice(MOCK_EMPLOYEES)
            assigned_count += 1
        
        await db.commit()
        
        logger.info("bulk_employee_assignment", assigned_count=assigned_count)
        
        return {
            "status": "success",
            "message": f"Assigned {assigned_count} complaints to random employees",
            "assigned_count": assigned_count
        }
        
    except Exception as e:
        logger.error("assign_employees_error", error=str(e))
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
