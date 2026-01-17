/**
 * Vadodara Municipal Corporation Complaint Center - TypeScript Type Definitions
 * 
 * These types mirror the backend API models and ensure type safety
 * across the frontend application.
 */

// ============================================================================
// Call Types
// ============================================================================

export type CallStatus = "processing" | "registered" | "escalated" | "failed" | "pending" | "dropped" | "active" | "completed";

export type SentimentType = "positive" | "neutral" | "negative" | "frustrated";

export interface CallLog {
  id: string;
  sessionId: string;
  caller: string;
  location?: string;
  calledAt: string;
  endedAt?: string;
  durationSeconds?: number;
  status: CallStatus;
  intent?: string;
  language?: string;
  sentiment?: SentimentType;
}

export interface TranscriptEntry {
  timestamp: string;
  speaker: string;  // "Caller" or "AI Agent"
  role?: string;    // "user" or "assistant"
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface CallDetail extends CallLog {
  transcript: TranscriptEntry[];
  extractedFields: Record<string, unknown>;
  confidenceScores: Record<string, number>;
  recordingUrl?: string;
  linkedComplaintId?: string;
}

// ============================================================================
// Complaint Types
// ============================================================================

export type ComplaintStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "Rejected";

export type UrgencyLevel = "Low" | "Medium" | "High" | "Critical";

export type ComplaintCategory =
  | "Garbage Collection"
  | "Streetlight Issue"
  | "Water Supply"
  | "Drainage/Sewage"
  | "Road Repair"
  | "Stray Animal"
  | "Illegal Encroachment"
  | "Other";

export interface Complaint {
  id: string;
  ticketNumber: string;
  category: string;
  description: string;
  location: string;
  contactNumber?: string;
  pincode?: string;
  landmark?: string;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  sourceCallId?: string;
  confidenceScores?: Record<string, number>;
  resolutionNotes?: string;
}

export interface ComplaintCreate {
  category: string;
  description: string;
  location: string;
  contactNumber?: string;
  pincode?: string;
  landmark?: string;
  urgency?: UrgencyLevel;
  sourceCallId?: string;
}

export interface ComplaintUpdate {
  status?: ComplaintStatus;
  urgency?: UrgencyLevel;
  assignedTo?: string;
  resolutionNotes?: string;
  category?: string;
  description?: string;
}

export interface ComplaintTimeline {
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
}

export interface ComplaintDetail extends Complaint {
  timeline: ComplaintTimeline[];
  linkedCall?: CallLog;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export type WebSocketEventType =
  | "call_started"
  | "call_updated"
  | "call_ended"
  | "transcript_update"
  | "form_update"
  | "complaint_created"
  | "complaint_updated"
  | "escalation"
  | "system_alert"
  | "active_calls_update"
  | "final_transcript"
  | "speak_action"
  | "system_state";

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  sessionId: string;
  timestamp: string;
  data: T;
}

export interface FormChange {
  field: string;
  from: unknown;
  to: unknown;
  confidence?: number;
}

export interface FormUpdateEvent {
  sessionId: string;
  form: Record<string, unknown>;
  changes: FormChange[];
  timestamp: string;
}

export interface TranscriptUpdateEvent {
  text: string;
  speaker: "user" | "ai";
  isFinal: boolean;
}

export interface EscalationEvent {
  callId: string;
  reason: string;
  callerNumber: string;
  currentForm: Record<string, unknown>;
}

// ============================================================================
// User & Auth Types
// ============================================================================

export type UserRole = "admin" | "supervisor" | "operator" | "viewer";

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: UserRole;
  zones?: string[];
  createdAt: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface AuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

// ============================================================================
// System & Config Types
// ============================================================================

export interface SystemConfig {
  defaultLanguage: string;
  urgencyThreshold: UrgencyLevel;
  autoEscalationEnabled: boolean;
  retentionDays: number;
  consentAnnouncementEnabled: boolean;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    database: "connected" | "disconnected";
    redis: "connected" | "disconnected";
    twilio: "ready" | "error";
    gemini: "ready" | "error";
    whisper: "ready" | "error";
    sarvamTts: "ready" | "error";
  };
}

export interface DashboardStats {
  calls24h: number;
  complaintsRegistered: number;
  aiAccuracyPercent: number;
  urgentActions: number;
  systemStatus: "online" | "offline" | "degraded";
  averageCallDurationSeconds: number;
  geminiLatencyMs: number;
  whisperLatencyMs: number;
  ttsLatencyMs: number;
}

// ============================================================================
// Audit & Logging Types
// ============================================================================

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "takeover"
  | "escalate"
  | "approve";

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  username?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  detail: string;
  code?: string;
  field?: string;
}

// ============================================================================
// Field Confidence Types
// ============================================================================

export interface FieldConfidence {
  field: string;
  value: string;
  confidence: number;
  source: "ai" | "operator";
}

export interface ExtractedFields {
  address?: FieldConfidence;
  contactNumber?: FieldConfidence;
  pincode?: FieldConfidence;
  category?: FieldConfidence;
  description?: FieldConfidence;
}

// ============================================================================
// Gemini AI Types
// ============================================================================

export type Intent = "complaint" | "status_check" | "general_inquiry" | "emergency" | "unknown";

export type NextAction = "ask" | "confirm" | "file" | "escalate" | "end";

export interface GeminiResponse {
  intent: Intent;
  complaintType?: string;
  fields: Record<string, unknown>;
  missingFields: string[];
  confidence: Record<string, number>;
  nextAction: NextAction;
  speak: string;
  languageDetected?: string;
  sentiment?: SentimentType;
  urgencySuggested?: UrgencyLevel;
}
