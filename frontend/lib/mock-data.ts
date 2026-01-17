import { Log } from "./hooks";
import { Complaint, ComplaintStatus, UrgencyLevel } from "./types";

export const MOCK_CALLS: Log[] = [
    {
        id: "call-001",
        callerId: "+91 98765 43210",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        duration: "2m 30s",
        language: "Hindi",
        intent: "Complaint Registration",
        status: "Completed",
        location: "Alkapuri",
        sentiment: "Neutral"
    },
    {
        id: "call-002",
        callerId: "+91 98765 43211",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        duration: "1m 45s",
        language: "Gujarati",
        intent: "Status Check",
        status: "Completed",
        location: "Manjalpur",
        sentiment: "Positive"
    },
    {
        id: "call-003",
        callerId: "+91 98765 43212",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        duration: "0m 45s",
        language: "Hindi",
        intent: "General Inquiry",
        status: "Dropped",
        location: "Karelibaug",
        sentiment: "Negative"
    },
    {
        id: "call-004",
        callerId: "+91 98765 43213",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        duration: "3m 15s",
        language: "English",
        intent: "Complaint Registration",
        status: "Action Required",
        location: "Fatehgunj",
        sentiment: "Frustrated"
    },
    {
        id: "call-005",
        callerId: "+91 98765 43214",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        duration: "1m 15s",
        language: "Hindi",
        intent: "Status Check",
        status: "Completed",
        location: "Sayajigunj",
        sentiment: "Neutral"
    }
];

export const MOCK_COMPLAINTS: Complaint[] = [
    {
        id: "comp-001",
        ticketNumber: "VMC-2024-001",
        category: "Garbage Collection",
        description: "Garbage not collected from Society main gate for 3 days.",
        location: "Alkapuri, Vadodara",
        status: "Open" as ComplaintStatus,
        urgency: "High" as UrgencyLevel,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        assignedTo: "Rajesh Kumar",
        confidenceScores: { category: 0.95, location: 0.88 },
    },
    {
        id: "comp-002",
        ticketNumber: "VMC-2024-002",
        category: "Streetlight Issue",
        description: "Street light flickering near community hall.",
        location: "Manjalpur, Vadodara",
        status: "In Progress" as ComplaintStatus,
        urgency: "Medium" as UrgencyLevel,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        assignedTo: "Suresh Patel",
        confidenceScores: { category: 0.92, location: 0.95 },
    },
    {
        id: "comp-003",
        ticketNumber: "VMC-2024-003",
        category: "Water Supply",
        description: "Low water pressure in the area.",
        location: "Karelibaug, Vadodara",
        status: "Resolved" as ComplaintStatus,
        urgency: "High" as UrgencyLevel,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        assignedTo: "Mahesh Shah",
        confidenceScores: { category: 0.89, location: 0.91 },
    },
];
