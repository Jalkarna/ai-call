/**
 * API Client for Vadodara Municipal Corporation Complaint Center Backend
 * 
 * This module provides a centralized API client with:
 * - Automatic error handling
 * - Request/response typing
 * - Base URL configuration
 * - Timeout handling
 */

// Backend API base URL - defaults to localhost:8000 in development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 10000;

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generic fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main API request function
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(
      errorData?.detail || `API Error: ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json();
}

// ============================================================================
// Health Check
// ============================================================================

export interface HealthStatus {
  status: string;
  services?: {
    database: string;
    redis: string;
    twilio: string;
    gemini: string;
    whisper: string;
    sarvam_tts: string;
  };
}

/**
 * Check if backend is available
 */
export async function checkHealth(): Promise<HealthStatus> {
  return apiRequest<HealthStatus>("/health");
}


/**
 * Check if backend is reachable using WebSocket status with HTTP fallback
 */
export async function isBackendAvailable(): Promise<boolean> {
  if (typeof window !== "undefined") {
    try {
      // First check WebSocket status
      const { getGlobalWebSocketManager } = await import("./websocket");
      const manager = getGlobalWebSocketManager();
      const wsStatus = manager.getStatus();
      
      // If WebSocket is connected, backend is definitely available
      if (wsStatus === "connected") {
        return true;
      }
      
      // If WebSocket is connecting or disconnected, try HTTP health check as fallback
      // This handles the case where WebSocket hasn't connected yet but HTTP works
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000);
        return response.ok;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Force backend status refresh (no-op now, kept for compatibility)
 */
export function refreshBackendStatus() {
  // WebSocket handles connection status automatically
}


// ============================================================================
// Calls API
// ============================================================================

export interface CallLogResponse {
  id: string;
  session_id: string;
  caller: string;
  location?: string;
  called_at: string; // Assuming mapped from start_time
  ended_at?: string;
  duration_seconds?: number;
  duration?: string; // Formatted duration
  status: string;
  status_display?: string; // Display-friendly status
  intent?: string;
  language?: string;
  language_display?: string; // Display-friendly language
  sentiment?: string;
  transcript?: any[]; // Array of entries
  transcripts?: any[]; // Backend name might be plural
  complaints?: any[];
  confidence_scores?: Record<string, number>;
  confidenceScores?: Record<string, number>; // camelCase version
  current_form?: Record<string, any>;
  extractedFields?: Record<string, any>; // New API field
  recording_url?: string;
}

export interface CallListResponse {
  items: CallLogResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface CallFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  language?: string;
  sentiment?: string;
  search?: string;
}

/**
 * Fetch paginated call logs
 */
/**
 * Fetch paginated call logs
 */
export async function fetchCalls(filters: CallFilters = {}): Promise<CallListResponse> {
  const params = new URLSearchParams();
  const limit = filters.pageSize || 10;
  const page = filters.page || 1;
  const offset = (page - 1) * limit;

  params.set("offset", offset.toString());
  params.set("limit", limit.toString());
  if (filters.status) params.set("status", filters.status);
  if (filters.language) params.set("language", filters.language);
  if (filters.sentiment) params.set("sentiment", filters.sentiment);
  if (filters.search) params.set("search", filters.search);

  const query = params.toString();
  try {
    const response = await apiRequest<CallListResponse>(`/api/calls/history${query ? `?${query}` : ""}`);
    return response;
  } catch (error) {
    console.error("fetchCalls error", error);
    throw error;
  }
}

/**
 * Fetch single call details
 */
export async function fetchCallById(callId: string): Promise<CallLogResponse> {
  return apiRequest<CallLogResponse>(`/api/calls/${callId}`);
}

// ============================================================================
// Complaints API
// ============================================================================

export interface ComplaintResponse {
  id: string;
  ticket_number: string;
  category: string;
  description: string;
  location: string;
  contact_number?: string;
  pincode?: string;
  status: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  source_call_id?: string;
  confidence_scores?: Record<string, number>;
}

export interface ComplaintListResponse {
  items: ComplaintResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface ComplaintFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  urgency?: string;
  category?: string;
  search?: string;
}

export interface ComplaintCreateRequest {
  category: string;
  description: string;
  location: string;
  contact_number?: string;
  pincode?: string;
  urgency?: string;
  source_call_id?: string;
}

export interface ComplaintUpdateRequest {
  status?: string;
  urgency?: string;
  assigned_to?: string;
  resolution_notes?: string;
}

/**
 * Fetch paginated complaints
 */
export async function fetchComplaints(filters: ComplaintFilters = {}): Promise<ComplaintListResponse> {
  const params = new URLSearchParams();
  const limit = filters.pageSize || 10;
  const page = filters.page || 1;
  const skip = (page - 1) * limit;

  params.set("skip", skip.toString());
  params.set("limit", limit.toString());
  if (filters.status) params.set("status", filters.status);
  if (filters.urgency) params.set("urgency", filters.urgency);
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);

  const query = params.toString();
  try {
    const rawComplaints = await apiRequest<any[]>(`/api/complaints${query ? `?${query}` : ""}`);
    // Backend returns list, wrapper needed for PaginatedResponse format expected by hooks
    return {
      items: rawComplaints.map((c: any) => ({
        id: c.id,
        ticket_number: c.ticket_id,
        category: c.complaint_type,
        description: c.description,
        location: c.address,
        contact_number: c.contact_number,
        pincode: c.pincode,
        status: c.status,
        urgency: c.urgency,
        created_at: c.created_at,
        updated_at: c.updated_at,
        assigned_to: c.assigned_to,
      })),
      total: rawComplaints.length, // TODO: Backend should return total count for pagination
      page: page,
      page_size: limit
    };
  } catch (error) {
    console.error("fetchComplaints error", error);
    throw error;
  }
}

/**
 * Fetch single complaint details
 */
export async function fetchComplaintById(complaintId: string): Promise<ComplaintResponse> {
  const raw = await apiRequest<any>(`/api/complaints/${complaintId}`);
  // Transform backend response to frontend format
  return {
    id: raw.id,
    ticket_number: raw.ticket_id,
    category: raw.complaint_type,
    description: raw.description,
    location: raw.address,
    contact_number: raw.contact_number,
    pincode: raw.pincode,
    status: raw.status,
    urgency: raw.urgency,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    assigned_to: raw.assigned_to,
  };
}

/**
 * Create a new complaint
 */
export async function createComplaint(data: ComplaintCreateRequest): Promise<ComplaintResponse> {
  return apiRequest<ComplaintResponse>("/api/complaints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update a complaint
 */
export async function updateComplaint(
  complaintId: string,
  data: ComplaintUpdateRequest
): Promise<ComplaintResponse> {
  return apiRequest<ComplaintResponse>(`/api/complaints/${complaintId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Analytics API
// ============================================================================

export interface AnalyticsResponse {
  total_calls: number;
  total_complaints: number;
  avg_handle_time_seconds: number;
  resolution_rate: number;
  calls_by_language: Record<string, number>;
  complaints_by_category: Record<string, number>;
  complaints_by_status: Record<string, number>;
  hourly_call_volume: { hour: number; count: number }[];
  daily_trend: { date: string; calls: number; complaints: number }[];
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  period?: "24h" | "7d" | "30d" | "90d";
}

/**
 * Fetch analytics data
 */
export async function fetchAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  if (filters.period) params.set("time_range", filters.period);

  const query = params.toString();
  try {
    const stats = await apiRequest<any>(`/api/admin/stats${query ? `?${query}` : ""}`);

    // Map backend response to AnalyticsResponse
    // Note: Backend stats are simpler than what frontend expects, filling gaps with 0
    return {
      total_calls: stats.total_calls,
      total_complaints: stats.filed_complaints,
      avg_handle_time_seconds: stats.avg_call_duration_seconds,
      resolution_rate: stats.completed_calls / (stats.total_calls || 1) * 100,

      // Mocking detailed breakdown until backend supports it
      calls_by_language: { "Hindi": stats.total_calls },
      complaints_by_category: { "Other": stats.filed_complaints },
      complaints_by_status: { "Open": stats.filed_complaints },
      hourly_call_volume: [],
      daily_trend: []
    };
  } catch (error) {
    console.error("fetchAnalytics error", error);
    throw error;
  }
}

// ============================================================================
// Admin API
// ============================================================================

export interface SystemConfig {
  default_language: string;
  urgency_threshold: string;
  auto_escalation_enabled: boolean;
  retention_days: number;
  consent_announcement_enabled: boolean;
}

/**
 * Fetch system configuration
 */
export async function fetchConfig(): Promise<SystemConfig> {
  return apiRequest<SystemConfig>("/api/admin/config");
}

/**
 * Update system configuration
 */
export async function updateConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
  return apiRequest<SystemConfig>("/api/admin/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

// Export API base URL for components that need it
export { API_BASE_URL };
