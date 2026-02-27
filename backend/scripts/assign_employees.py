#!/usr/bin/env python3
"""
Assign random employees to all existing complaints
"""

import asyncio
import sys
import os
import uuid
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import async_session_factory
from app.models import Complaint
from sqlalchemy import select, update


# Mock employee UUIDs
MOCK_EMPLOYEES = [
    uuid.UUID("e1a2b3c4-5d6e-7f8a-9012-1a2b3c4d5e6f"),  # Rajesh Kumar
    uuid.UUID("f2b3c4d5-6e7f-8901-2345-2b3c4d5e6f7a"),  # Priya Shah
    uuid.UUID("a3c4d5e6-7f89-0123-4567-3c4d5e6f7a8b"),  # Amit Patel
    uuid.UUID("b4d5e6f7-8901-2345-6789-4d5e6f7a8b9c"),  # Neha Desai
    uuid.UUID("c5e6f7a8-9012-3456-789a-5e6f7a8b9c0d"),  # Vikram Singh
]


async def assign_employees():
    """Assign random employees to all existing complaints."""
    
    async with async_session_factory() as db:
        # Get all complaints without assignment
        query = select(Complaint).where(Complaint.assigned_to == None)
        result = await db.execute(query)
        complaints = result.scalars().all()
        
        if not complaints:
            print("✅ No unassigned complaints found")
            return
        
        print(f"📋 Found {len(complaints)} unassigned complaints")
        
        # Assign each complaint to a random employee
        for complaint in complaints:
            assigned_employee = random.choice(MOCK_EMPLOYEES)
            complaint.assigned_to = assigned_employee
            print(f"  ✓ Assigned {complaint.ticket_id} to employee {assigned_employee}")
        
        # Commit all changes
        await db.commit()
        
        print(f"\n✅ Successfully assigned {len(complaints)} complaints to random employees")


if __name__ == "__main__":
    print("🔄 Assigning employees to existing complaints...\n")
    asyncio.run(assign_employees())
    print("\n✨ Done!")
