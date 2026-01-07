
import { addMinutes, subDays, subMinutes } from "date-fns";

export type ComplaintStatus = "Open" | "In Progress" | "Resolved";
export type UrgencyLevel = "Low" | "Medium" | "High" | "Critical";

export interface Log {
  id: string;
  callerId: string;
  timestamp: string;
  duration: string;
  language: string;
  intent: string;
  status: "Completed" | "Dropped" | "Action Required";
  location: string;
  sentiment: "Positive" | "Neutral" | "Negative" | "Frustrated";
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  category: string;
  description: string;
  location: string;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  timestamp: string;
  assignedTo?: string;
}

const LOCATIONS = [
  "Alkapuri, Vadodara",
  "Manjalpur, Vadodara",
  "Karelibaug, Vadodara",
  "Fatehgunj, Vadodara",
  "Gotri, Vadodara",
  "Sayajigunj, Vadodara",
  "Akota, Vadodara",
  "Waghodia Road, Vadodara",
];

const CATEGORIES = [
  "Garbage Collection",
  "Streetlight Issue",
  "Water Supply",
  "Drainage/Sewage",
  "Road Repair",
  "Stray Animal",
  "Illegal Encroachment",
];

const INTENTS = [
  "Report Complaint",
  "Check Complaint Status",
  "General Inquiry",
  "Emergency Assistance",
];

const ID_PREFIX = "VMC";

const generateRandomId = () => Math.random().toString(36).substr(2, 9);

export const generateMockCalls = (count: number): Log[] => {
  return Array.from({ length: count }).map((_, i) => {
    const isRecent = i < 5;
    const date = subMinutes(new Date(), i * (isRecent ? 2 : 15));
    
    return {
      id: generateRandomId(),
      callerId: `+91 98*** **${Math.floor(Math.random() * 900) + 100}`,
      timestamp: date.toISOString(),
      duration: `${Math.floor(Math.random() * 5) + 1}m ${Math.floor(Math.random() * 59)}s`,
      language: ["Hindi", "Gujarati", "English"][Math.floor(Math.random() * 3)],
      intent: INTENTS[Math.floor(Math.random() * INTENTS.length)],
      status: (Math.random() > 0.1 ? "Completed" : "Dropped") as Log["status"],
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      sentiment: ["Positive", "Neutral", "Negative", "Frustrated"][Math.floor(Math.random() * 4)] as Log["sentiment"],
    };
  });
};

export const generateMockComplaints = (count: number): Complaint[] => {
  return Array.from({ length: count }).map((_, i) => {
    const date = subDays(new Date(), Math.floor(Math.random() * 7));
    const urgency = ["Low", "Medium", "High", "Critical"][Math.floor(Math.random() * 4)] as UrgencyLevel;
    
    return {
      id: generateRandomId(),
      ticketNumber: `${ID_PREFIX}-${2024000 + i}`,
      category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
      description: "Resident reported issue via AI voice assistant. Details automatically extracted.",
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      status: ["Open", "In Progress", "Resolved"][Math.floor(Math.random() * 3)] as ComplaintStatus,
      urgency,
      timestamp: date.toISOString(),
      assignedTo: Math.random() > 0.5 ? "Zone Officer A" : undefined,
    };
  });
};

export const MOCK_CALLS = generateMockCalls(20);
export const MOCK_COMPLAINTS = generateMockComplaints(15);
