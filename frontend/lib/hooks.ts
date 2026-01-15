/**
 * Data Fetching Hooks for VMC Voice AI
 * 
 * These hooks provide seamless data fetching with automatic fallback to mock data
 * when the backend is unavailable. They use SWR-like patterns for caching and revalidation.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  isBackendAvailable,
  fetchCalls,
  fetchCallById,
  fetchComplaints,
  fetchComplaintById,
  fetchAnalytics,
  type CallFilters,
  type ComplaintFilters,
  type AnalyticsFilters,
  type CallLogResponse,
  type ComplaintResponse,
  type AnalyticsResponse,
} from "./api-client";
import { MOCK_CALLS, MOCK_COMPLAINTS, type Log, type Complaint } from "./mock-data";

// ============================================================================
// Types
// ============================================================================

interface DataState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isFromBackend: boolean;
}

interface PaginatedState<T> extends DataState<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// Backend Status Hook
// ============================================================================

let backendStatusCache: boolean | null = null;
let statusCheckPromise: Promise<boolean> | null = null;

/**
 * Hook to check if backend is available
 */
export function useBackendStatus() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(backendStatusCache);
  const [isChecking, setIsChecking] = useState(backendStatusCache === null);

  useEffect(() => {
    const checkBackend = async () => {
      // If already checking, wait for the existing promise
      if (statusCheckPromise) {
        const result = await statusCheckPromise;
        setIsAvailable(result);
        setIsChecking(false);
        return;
      }

      // Start a new check
      setIsChecking(true);
      statusCheckPromise = isBackendAvailable();
      
      try {
        const available = await statusCheckPromise;
        backendStatusCache = available;
        setIsAvailable(available);
      } catch {
        backendStatusCache = false;
        setIsAvailable(false);
      } finally {
        statusCheckPromise = null;
        setIsChecking(false);
      }
    };

    checkBackend();

    // Recheck every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isAvailable, isChecking };
}

// ============================================================================
// Call Hooks
// ============================================================================

/**
 * Transform backend call response to frontend Log type
 */
function transformCallResponse(call: CallLogResponse): Log {
  const duration = call.duration_seconds || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  // Safely transform sentiment
  const sentimentValue = call.sentiment 
    ? (call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1)) as Log["sentiment"]
    : "Neutral";

  return {
    id: call.id,
    callerId: call.caller,
    timestamp: call.called_at,
    duration: `${minutes}m ${seconds}s`,
    language: call.language || "Hindi",
    intent: call.intent || "General Inquiry",
    status: call.status === "dropped" ? "Dropped" : 
            call.status === "escalated" ? "Action Required" : "Completed",
    location: call.location || "Unknown",
    sentiment: sentimentValue,
  };
}

/**
 * Hook to fetch calls with automatic mock data fallback
 */
export function useCalls(filters: CallFilters = {}) {
  const [state, setState] = useState<PaginatedState<Log>>({
    data: null,
    isLoading: true,
    error: null,
    isFromBackend: false,
    total: 0,
    page: filters.page || 1,
    pageSize: filters.pageSize || 10,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try backend first
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        const response = await fetchCalls(filters);
        const transformedCalls = response.items.map(transformCallResponse);
        
        setState({
          data: transformedCalls,
          isLoading: false,
          error: null,
          isFromBackend: true,
          total: response.total,
          page: response.page,
          pageSize: response.page_size,
        });
      } else {
        // Use mock data
        let mockData = [...MOCK_CALLS];
        
        // Apply filters to mock data
        if (filters.language && filters.language !== "all") {
          mockData = mockData.filter((c) => c.language === filters.language);
        }
        if (filters.status && filters.status !== "all") {
          mockData = mockData.filter((c) => c.status === filters.status);
        }
        if (filters.sentiment && filters.sentiment !== "all") {
          mockData = mockData.filter((c) => c.sentiment === filters.sentiment);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          mockData = mockData.filter(
            (c) =>
              c.callerId.toLowerCase().includes(searchLower) ||
              c.location.toLowerCase().includes(searchLower) ||
              c.intent.toLowerCase().includes(searchLower)
          );
        }

        // Pagination
        const page = filters.page || 1;
        const pageSize = filters.pageSize || 10;
        const start = (page - 1) * pageSize;
        const paginatedData = mockData.slice(start, start + pageSize);

        setState({
          data: paginatedData,
          isLoading: false,
          error: null,
          isFromBackend: false,
          total: mockData.length,
          page,
          pageSize,
        });
      }
    } catch (error) {
      // Fallback to mock data on error
      const mockData = MOCK_CALLS.slice(0, filters.pageSize || 10);
      setState({
        data: mockData,
        isLoading: false,
        error: error as Error,
        isFromBackend: false,
        total: MOCK_CALLS.length,
        page: 1,
        pageSize: filters.pageSize || 10,
      });
    }
  }, [filters.page, filters.pageSize, filters.language, filters.status, filters.sentiment, filters.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Hook to fetch a single call by ID
 */
export function useCall(callId: string | null) {
  const [state, setState] = useState<DataState<Log>>({
    data: null,
    isLoading: true,
    error: null,
    isFromBackend: false,
  });

  useEffect(() => {
    if (!callId) {
      setState({ data: null, isLoading: false, error: null, isFromBackend: false });
      return;
    }

    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const backendAvailable = await isBackendAvailable();

        if (backendAvailable) {
          const response = await fetchCallById(callId);
          setState({
            data: transformCallResponse(response),
            isLoading: false,
            error: null,
            isFromBackend: true,
          });
        } else {
          // Find in mock data
          const mockCall = MOCK_CALLS.find((c) => c.id === callId);
          setState({
            data: mockCall || null,
            isLoading: false,
            error: mockCall ? null : new Error("Call not found"),
            isFromBackend: false,
          });
        }
      } catch (error) {
        const mockCall = MOCK_CALLS.find((c) => c.id === callId);
        setState({
          data: mockCall || null,
          isLoading: false,
          error: error as Error,
          isFromBackend: false,
        });
      }
    };

    fetchData();
  }, [callId]);

  return state;
}

// ============================================================================
// Complaint Hooks
// ============================================================================

/**
 * Transform backend complaint response to frontend Complaint type
 */
function transformComplaintResponse(complaint: ComplaintResponse): Complaint {
  return {
    id: complaint.id,
    ticketNumber: complaint.ticket_number,
    category: complaint.category,
    description: complaint.description,
    location: complaint.location,
    status: complaint.status as Complaint["status"],
    urgency: complaint.urgency as Complaint["urgency"],
    timestamp: complaint.created_at,
    assignedTo: complaint.assigned_to,
  };
}

/**
 * Hook to fetch complaints with automatic mock data fallback
 */
export function useComplaints(filters: ComplaintFilters = {}) {
  const [state, setState] = useState<PaginatedState<Complaint>>({
    data: null,
    isLoading: true,
    error: null,
    isFromBackend: false,
    total: 0,
    page: filters.page || 1,
    pageSize: filters.pageSize || 10,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const backendAvailable = await isBackendAvailable();

      if (backendAvailable) {
        const response = await fetchComplaints(filters);
        const transformedComplaints = response.items.map(transformComplaintResponse);

        setState({
          data: transformedComplaints,
          isLoading: false,
          error: null,
          isFromBackend: true,
          total: response.total,
          page: response.page,
          pageSize: response.page_size,
        });
      } else {
        // Use mock data
        let mockData = [...MOCK_COMPLAINTS];

        // Apply filters
        if (filters.status && filters.status !== "all") {
          mockData = mockData.filter((c) => c.status === filters.status);
        }
        if (filters.urgency && filters.urgency !== "all") {
          mockData = mockData.filter((c) => c.urgency === filters.urgency);
        }
        if (filters.category && filters.category !== "all") {
          mockData = mockData.filter((c) => c.category === filters.category);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          mockData = mockData.filter(
            (c) =>
              c.ticketNumber.toLowerCase().includes(searchLower) ||
              c.location.toLowerCase().includes(searchLower) ||
              c.category.toLowerCase().includes(searchLower) ||
              c.description.toLowerCase().includes(searchLower)
          );
        }

        // Pagination
        const page = filters.page || 1;
        const pageSize = filters.pageSize || 10;
        const start = (page - 1) * pageSize;
        const paginatedData = mockData.slice(start, start + pageSize);

        setState({
          data: paginatedData,
          isLoading: false,
          error: null,
          isFromBackend: false,
          total: mockData.length,
          page,
          pageSize,
        });
      }
    } catch (error) {
      const mockData = MOCK_COMPLAINTS.slice(0, filters.pageSize || 10);
      setState({
        data: mockData,
        isLoading: false,
        error: error as Error,
        isFromBackend: false,
        total: MOCK_COMPLAINTS.length,
        page: 1,
        pageSize: filters.pageSize || 10,
      });
    }
  }, [filters.page, filters.pageSize, filters.status, filters.urgency, filters.category, filters.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Hook to fetch a single complaint by ID
 */
export function useComplaint(complaintId: string | null) {
  const [state, setState] = useState<DataState<Complaint>>({
    data: null,
    isLoading: true,
    error: null,
    isFromBackend: false,
  });

  useEffect(() => {
    if (!complaintId) {
      setState({ data: null, isLoading: false, error: null, isFromBackend: false });
      return;
    }

    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const backendAvailable = await isBackendAvailable();

        if (backendAvailable) {
          const response = await fetchComplaintById(complaintId);
          setState({
            data: transformComplaintResponse(response),
            isLoading: false,
            error: null,
            isFromBackend: true,
          });
        } else {
          const mockComplaint = MOCK_COMPLAINTS.find((c) => c.id === complaintId);
          setState({
            data: mockComplaint || null,
            isLoading: false,
            error: mockComplaint ? null : new Error("Complaint not found"),
            isFromBackend: false,
          });
        }
      } catch (error) {
        const mockComplaint = MOCK_COMPLAINTS.find((c) => c.id === complaintId);
        setState({
          data: mockComplaint || null,
          isLoading: false,
          error: error as Error,
          isFromBackend: false,
        });
      }
    };

    fetchData();
  }, [complaintId]);

  return state;
}

// ============================================================================
// Analytics Hooks
// ============================================================================

interface AnalyticsData {
  totalCalls: number;
  totalComplaints: number;
  avgHandleTime: number;
  resolutionRate: number;
  callsByLanguage: { name: string; value: number }[];
  complaintsByCategory: { name: string; value: number }[];
  complaintsByStatus: { name: string; value: number }[];
  hourlyVolume: { hour: string; calls: number }[];
  dailyTrend: { date: string; calls: number; complaints: number }[];
}

/**
 * Generate mock analytics data
 */
function generateMockAnalytics(): AnalyticsData {
  return {
    totalCalls: MOCK_CALLS.length,
    totalComplaints: MOCK_COMPLAINTS.length,
    avgHandleTime: 185, // seconds
    resolutionRate: 78,
    callsByLanguage: [
      { name: "Hindi", value: Math.floor(MOCK_CALLS.length * 0.5) },
      { name: "Gujarati", value: Math.floor(MOCK_CALLS.length * 0.3) },
      { name: "English", value: Math.floor(MOCK_CALLS.length * 0.2) },
    ],
    complaintsByCategory: [
      { name: "Garbage", value: 5 },
      { name: "Streetlight", value: 3 },
      { name: "Water", value: 4 },
      { name: "Drainage", value: 2 },
      { name: "Road", value: 1 },
    ],
    complaintsByStatus: [
      { name: "Open", value: MOCK_COMPLAINTS.filter((c) => c.status === "Open").length },
      { name: "In Progress", value: MOCK_COMPLAINTS.filter((c) => c.status === "In Progress").length },
      { name: "Resolved", value: MOCK_COMPLAINTS.filter((c) => c.status === "Resolved").length },
    ],
    hourlyVolume: Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, "0")}:00`,
      calls: Math.floor(Math.random() * 20) + 5,
    })),
    dailyTrend: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        calls: Math.floor(Math.random() * 50) + 30,
        complaints: Math.floor(Math.random() * 15) + 5,
      };
    }),
  };
}

/**
 * Hook to fetch analytics data
 */
export function useAnalytics(filters: AnalyticsFilters = {}) {
  const [state, setState] = useState<DataState<AnalyticsData>>({
    data: null,
    isLoading: true,
    error: null,
    isFromBackend: false,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const backendAvailable = await isBackendAvailable();

      if (backendAvailable) {
        const response = await fetchAnalytics(filters);
        
        const analyticsData: AnalyticsData = {
          totalCalls: response.total_calls,
          totalComplaints: response.total_complaints,
          avgHandleTime: response.avg_handle_time_seconds,
          resolutionRate: response.resolution_rate,
          callsByLanguage: Object.entries(response.calls_by_language).map(([name, value]) => ({
            name,
            value,
          })),
          complaintsByCategory: Object.entries(response.complaints_by_category).map(([name, value]) => ({
            name,
            value,
          })),
          complaintsByStatus: Object.entries(response.complaints_by_status).map(([name, value]) => ({
            name,
            value,
          })),
          hourlyVolume: response.hourly_call_volume.map((h) => ({
            hour: `${h.hour.toString().padStart(2, "0")}:00`,
            calls: h.count,
          })),
          dailyTrend: response.daily_trend,
        };

        setState({
          data: analyticsData,
          isLoading: false,
          error: null,
          isFromBackend: true,
        });
      } else {
        setState({
          data: generateMockAnalytics(),
          isLoading: false,
          error: null,
          isFromBackend: false,
        });
      }
    } catch (error) {
      setState({
        data: generateMockAnalytics(),
        isLoading: false,
        error: error as Error,
        isFromBackend: false,
      });
    }
  }, [filters.period, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// ============================================================================
// Dashboard Stats Hook
// ============================================================================

interface DashboardStats {
  totalCalls: number;
  totalComplaints: number;
  avgHandleTime: string;
  urgentActions: number;
  activeCalls: number;
  completedToday: number;
  droppedToday: number;
  openComplaints: number;
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  const [state, setState] = useState<DataState<DashboardStats>>({
    data: null,
    isLoading: true,
    error: null,
    isFromBackend: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const backendAvailable = await isBackendAvailable();

        if (backendAvailable) {
          const analytics = await fetchAnalytics({ period: "24h" });
          
          setState({
            data: {
              totalCalls: analytics.total_calls,
              totalComplaints: analytics.total_complaints,
              avgHandleTime: `${Math.floor(analytics.avg_handle_time_seconds / 60)}m ${analytics.avg_handle_time_seconds % 60}s`,
              urgentActions: 3, // Would come from real API
              activeCalls: 2,
              completedToday: Math.floor(analytics.total_calls * 0.9),
              droppedToday: Math.floor(analytics.total_calls * 0.1),
              openComplaints: analytics.complaints_by_status?.Open || 5,
            },
            isLoading: false,
            error: null,
            isFromBackend: true,
          });
        } else {
          // Generate from mock data
          const todayCalls = MOCK_CALLS.slice(0, 10);
          const completed = todayCalls.filter((c) => c.status === "Completed").length;
          const dropped = todayCalls.filter((c) => c.status === "Dropped").length;
          const openComplaints = MOCK_COMPLAINTS.filter((c) => c.status === "Open").length;
          const urgentComplaints = MOCK_COMPLAINTS.filter((c) => c.urgency === "Critical" || c.urgency === "High").length;

          setState({
            data: {
              totalCalls: MOCK_CALLS.length,
              totalComplaints: MOCK_COMPLAINTS.length,
              avgHandleTime: "3m 5s",
              urgentActions: urgentComplaints,
              activeCalls: 2,
              completedToday: completed,
              droppedToday: dropped,
              openComplaints,
            },
            isLoading: false,
            error: null,
            isFromBackend: false,
          });
        }
      } catch (error) {
        // Fallback
        setState({
          data: {
            totalCalls: MOCK_CALLS.length,
            totalComplaints: MOCK_COMPLAINTS.length,
            avgHandleTime: "3m 5s",
            urgentActions: 3,
            activeCalls: 2,
            completedToday: 18,
            droppedToday: 2,
            openComplaints: 5,
          },
          isLoading: false,
          error: error as Error,
          isFromBackend: false,
        });
      }
    };

    fetchData();
    
    // Refresh every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
