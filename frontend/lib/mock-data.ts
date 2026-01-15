
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

// Seeded random number generator for consistent server/client rendering
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

const generateRandomId = (rng: SeededRandom) => {
  return Math.floor(rng.next() * 1000000000).toString(36);
};

export const generateMockCalls = (count: number): Log[] => {
  const rng = new SeededRandom(12345); // Fixed seed for consistent results
  
  return Array.from({ length: count }).map((_, i) => {
    const isRecent = i < 5;
    const date = subMinutes(new Date(), i * (isRecent ? 2 : 15));
    
    return {
      id: generateRandomId(rng),
      callerId: `+91 ${Math.floor(rng.next() * 90000 + 10000)} ${Math.floor(rng.next() * 90000 + 10000)}`,
      timestamp: date.toISOString(),
      duration: `${Math.floor(rng.next() * 5) + 1}m ${Math.floor(rng.next() * 59)}s`,
      language: ["Hindi", "Gujarati", "English"][Math.floor(rng.next() * 3)],
      intent: INTENTS[Math.floor(rng.next() * INTENTS.length)],
      status: (rng.next() > 0.1 ? "Completed" : "Dropped") as Log["status"],
      location: LOCATIONS[Math.floor(rng.next() * LOCATIONS.length)],
      sentiment: ["Positive", "Neutral", "Negative", "Frustrated"][Math.floor(rng.next() * 4)] as Log["sentiment"],
    };
  });
};

export const generateMockComplaints = (count: number): Complaint[] => {
  const rng = new SeededRandom(54321); // Fixed seed for consistent results
  
  return Array.from({ length: count }).map((_, i) => {
    const date = subDays(new Date(), Math.floor(rng.next() * 7));
    const urgency = ["Low", "Medium", "High", "Critical"][Math.floor(rng.next() * 4)] as UrgencyLevel;
    
    return {
      id: generateRandomId(rng),
      ticketNumber: `${ID_PREFIX}-${2024000 + i}`,
      category: CATEGORIES[Math.floor(rng.next() * CATEGORIES.length)],
      description: "Resident reported issue via AI voice assistant. Details automatically extracted.",
      location: LOCATIONS[Math.floor(rng.next() * LOCATIONS.length)],
      status: ["Open", "In Progress", "Resolved"][Math.floor(rng.next() * 3)] as ComplaintStatus,
      urgency,
      timestamp: date.toISOString(),
      assignedTo: rng.next() > 0.5 ? "Zone Officer A" : undefined,
    };
  });
};

export const MOCK_CALLS = generateMockCalls(20);
export const MOCK_COMPLAINTS = generateMockComplaints(15);
