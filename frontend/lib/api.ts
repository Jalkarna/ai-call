/**
 * Vadodara Municipal Corporation Complaint Center - API Service Layer
 * 
 * Centralized API client for all backend interactions.
 * Handles authentication, error handling, and request/response transformation.
 */

import type {
  CallLog,
  CallDetail,
  Complaint,
  ComplaintDetail,
  ComplaintCreate,
  ComplaintUpdate,
  SystemConfig,
  DashboardStats,
  User,
  AuditLog,
  PaginatedResponse,
  ApiError,
} from "./types";

import type { CallLogResponse } from "./api-client";

// Base API URL - configure via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================================================
// API Client Configuration
// ============================================================================

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: "An error occurred",
      }));
      throw new Error(error.detail);
    }

    return response.json();
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>(url, { method: "GET" });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Singleton API client instance
const api = new ApiClient(API_BASE_URL);

// ============================================================================
// Calls API
// ============================================================================

export const callsApi = {
  /**
   * Get paginated list of calls
   */
  list: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    language?: string;
    search?: string;
  }): Promise<{ items: CallLogResponse[]; total: number; page: number; page_size: number }> => {
    // Map skip to offset
    const queryParams: any = { ...params };
    if (params?.skip !== undefined) {
      queryParams.offset = params.skip;
      delete queryParams.skip;
    }
    return api.get<{ items: CallLogResponse[]; total: number; page: number; page_size: number }>("/api/calls/history", queryParams);
  },

  /**
   * Get call details by ID
   */
  get: async (callId: string): Promise<CallDetail> => {
    return api.get<CallDetail>(`/api/calls/${callId}`);
  },

  /**
   * Initiate human takeover for a call
   */
  takeover: async (callId: string): Promise<{ status: string; callId: string }> => {
    return api.post(`/api/calls/${callId}/takeover`);
  },

  /**
   * Escalate a call
   */
  escalate: async (callId: string, reason?: string): Promise<{ status: string; callId: string; reason?: string }> => {
    return api.post(`/api/calls/${callId}/escalate`, { reason });
  },
};

// ============================================================================
// Complaints API
// ============================================================================

export const complaintsApi = {
  /**
   * Get paginated list of complaints with filters
   */
  list: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    urgency?: string;
    category?: string;
    location?: string;
    search?: string;
  }): Promise<PaginatedResponse<Complaint>> => {
    const queryParams: any = { ...params };

    // Convert page/pageSize to skip/limit
    const limit = params?.pageSize || 50;
    const page = params?.page || 1;
    const skip = (page - 1) * limit;

    queryParams.limit = limit;
    queryParams.skip = skip;
    delete queryParams.page;
    delete queryParams.pageSize;

    return api.get<PaginatedResponse<Complaint>>("/api/complaints", queryParams);
  },

  /**
   * Get complaint details by ID
   */
  get: async (complaintId: string): Promise<ComplaintDetail> => {
    return api.get<ComplaintDetail>(`/api/complaints/${complaintId}`);
  },

  /**
   * Create a new complaint
   */
  create: async (complaint: ComplaintCreate): Promise<Complaint> => {
    return api.post<Complaint>("/api/complaints", complaint);
  },

  /**
   * Update a complaint
   */
  update: async (complaintId: string, update: ComplaintUpdate): Promise<Complaint> => {
    return api.patch<Complaint>(`/api/complaints/${complaintId}`, update);
  },

  /**
   * Update extracted fields (operator corrections)
   */
  updateFields: async (
    complaintId: string,
    fields: Record<string, unknown>,
    operatorId?: string
  ): Promise<{ status: string }> => {
    return api.post(`/api/complaints/${complaintId}/fields`, { fields, operatorId });
  },

  /**
   * Delete a complaint
   */
  delete: async (complaintId: string): Promise<{ status: string }> => {
    return api.delete(`/api/complaints/${complaintId}`);
  },

  /**
   * Get complaint statistics
   */
  stats: async (): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byUrgency: Record<string, number>;
    todayCount: number;
    resolvedToday: number;
    averageResolutionTimeHours: number;
  }> => {
    return api.get("/api/complaints/stats/summary");
  },
};

// ============================================================================
// Admin API
// ============================================================================

export const adminApi = {
  /**
   * Get system configuration
   */
  getConfig: async (): Promise<SystemConfig> => {
    return api.get<SystemConfig>("/api/admin/config");
  },

  /**
   * Update system configuration
   */
  updateConfig: async (config: Partial<SystemConfig>): Promise<SystemConfig> => {
    return api.patch<SystemConfig>("/api/admin/config", config);
  },

  /**
   * Get dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    return api.get<DashboardStats>("/api/admin/stats");
  },

  /**
   * Get list of users
   */
  getUsers: async (): Promise<User[]> => {
    return api.get<User[]>("/api/admin/users");
  },

  /**
   * Get audit logs
   */
  getAuditLogs: async (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    limit?: number;
  }): Promise<AuditLog[]> => {
    return api.get<AuditLog[]>("/api/admin/audit-logs", params);
  },

  /**
   * Export citizen data (GDPR)
   */
  exportCitizenData: async (phone: string): Promise<{
    phone: string;
    calls: CallLog[];
    complaints: Complaint[];
    exportedAt: string;
  }> => {
    return api.post(`/api/admin/data-export/${encodeURIComponent(phone)}`);
  },

  /**
   * Delete citizen data (GDPR)
   */
  deleteCitizenData: async (phone: string, reason: string): Promise<{ status: string }> => {
    return api.delete(`/api/admin/data-delete/${encodeURIComponent(phone)}?reason=${encodeURIComponent(reason)}`);
  },
};

// ============================================================================
// Health API
// ============================================================================

export const healthApi = {
  /**
   * Check system health
   */
  check: async (): Promise<{
    status: string;
    services: Record<string, string>;
  }> => {
    return api.get("/health");
  },
};

// Export the API client for direct use if needed
export { api };
