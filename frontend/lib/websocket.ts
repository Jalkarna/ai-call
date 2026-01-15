/**
 * Vadodara Municipal Corporation Complaint Center - WebSocket Hook
 * 
 * React hook for managing WebSocket connections to the backend
 * for real-time updates on calls, complaints, and system events.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { WebSocketEvent, WebSocketEventType } from "./types";

// WebSocket URL - configure via environment variable
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface UseWebSocketOptions {
  /** WebSocket endpoint path (e.g., "/api/calls/live") */
  endpoint: string;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval in milliseconds */
  reconnectInterval?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Event types to filter for */
  eventTypes?: WebSocketEventType[];
  /** Session ID to filter events for */
  sessionId?: string;
  /** Callback when connected */
  onConnect?: () => void;
  /** Callback when disconnected */
  onDisconnect?: () => void;
  /** Callback on error */
  onError?: (error: Event) => void;
}

export interface UseWebSocketReturn<T = unknown> {
  /** Current connection status */
  status: ConnectionStatus;
  /** Last received event */
  lastEvent: WebSocketEvent<T> | null;
  /** All received events (limited buffer) */
  events: WebSocketEvent<T>[];
  /** Send a message through the WebSocket */
  send: (data: unknown) => void;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Clear events buffer */
  clearEvents: () => void;
}

const MAX_EVENTS_BUFFER = 100;

export function useWebSocket<T = unknown>(
  options: UseWebSocketOptions
): UseWebSocketReturn<T> {
  const {
    endpoint,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    eventTypes,
    sessionId,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<WebSocketEvent<T> | null>(null);
  const [events, setEvents] = useState<WebSocketEvent<T>[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setStatus("connecting");

    const wsUrl = `${WS_BASE_URL}${endpoint}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
      onConnect?.();
    };

    ws.onclose = () => {
      setStatus("disconnected");
      onDisconnect?.();

      // Auto-reconnect if enabled
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      setStatus("error");
      onError?.(error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketEvent<T>;

        // Filter by event type if specified
        if (eventTypes && !eventTypes.includes(data.type)) {
          return;
        }

        // Filter by session ID if specified
        if (sessionId && data.sessionId !== sessionId) {
          return;
        }

        setLastEvent(data);
        setEvents((prev) => {
          const newEvents = [data, ...prev];
          // Keep buffer limited
          if (newEvents.length > MAX_EVENTS_BUFFER) {
            return newEvents.slice(0, MAX_EVENTS_BUFFER);
          }
          return newEvents;
        });
      } catch {
        console.error("Failed to parse WebSocket message:", event.data);
      }
    };

    wsRef.current = ws;
  }, [endpoint, autoReconnect, reconnectInterval, maxReconnectAttempts, eventTypes, sessionId, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset reconnect attempts
    reconnectAttemptsRef.current = maxReconnectAttempts;

    // Close the connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("disconnected");
  }, [maxReconnectAttempts]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    lastEvent,
    events,
    send,
    connect,
    disconnect,
    clearEvents,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for live call feed updates
 */
export function useLiveCallFeed() {
  return useWebSocket({
    endpoint: "/api/calls/live",
    eventTypes: ["call_started", "call_updated", "call_ended", "escalation"],
  });
}

/**
 * Hook for specific call session updates
 */
export function useCallSession(sessionId: string) {
  return useWebSocket({
    endpoint: "/api/calls/live",
    sessionId,
    eventTypes: ["transcript_update", "form_update", "call_updated", "call_ended"],
  });
}

/**
 * Hook for complaint updates
 */
export function useComplaintUpdates() {
  return useWebSocket({
    endpoint: "/api/calls/live",
    eventTypes: ["complaint_created", "complaint_updated"],
  });
}

/**
 * Hook for system alerts
 */
export function useSystemAlerts() {
  return useWebSocket({
    endpoint: "/api/calls/live",
    eventTypes: ["system_alert", "escalation"],
  });
}
