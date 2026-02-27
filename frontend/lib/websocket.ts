/**
 * Global WebSocket Manager for VMC AI Call Center
 * 
 * Provides a single WebSocket connection that all components can subscribe to.
 * Eliminates reconnection storms and excessive connections.
 */

"use client";

import type { WebSocketEvent, WebSocketEventType } from "./types";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

type EventCallback = (event: WebSocketEvent) => void;
type StatusCallback = (status: ConnectionStatus) => void;

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

class GlobalWebSocketManager {
  private ws: WebSocket | null = null;
  private endpoint: string = "/ws/dashboard";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 3000;
  private status: ConnectionStatus = "disconnected";
  
  // Subscribers
  private eventSubscribers: Map<string, EventCallback> = new Map();
  private statusSubscribers: Map<string, StatusCallback> = new Map();
  
  constructor() {
    if (typeof window !== "undefined") {
      this.connect();
    }
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.setStatus("connecting");
    const wsUrl = `${WS_BASE_URL}${this.endpoint}`;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.reconnectAttempts = 0;
        this.setStatus("connected");
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        this.setStatus("disconnected");
        this.scheduleReconnect();
      };

      this.ws.onerror = (error: Event) => {
        console.error("❌ WebSocket error:", error);
        this.setStatus("error");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          this.notifyEventSubscribers(data);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      this.setStatus("error");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("⚠️ Max reconnection attempts reached");
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.notifyStatusSubscribers(status);
  }

  private notifyEventSubscribers(event: WebSocketEvent) {
    this.eventSubscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error("Error in event subscriber:", err);
      }
    });
  }

  private notifyStatusSubscribers(status: ConnectionStatus) {
    this.statusSubscribers.forEach((callback) => {
      try {
        callback(status);
      } catch (err) {
        console.error("Error in status subscriber:", err);
      }
    });
  }

  // Public API
  subscribe(id: string, callback: EventCallback): () => void {
    this.eventSubscribers.set(id, callback);
    return () => {
      this.eventSubscribers.delete(id);
    };
  }

  subscribeStatus(id: string, callback: StatusCallback): () => void {
    this.statusSubscribers.set(id, callback);
    // Immediately call with current status
    callback(this.status);
    return () => {
      this.statusSubscribers.delete(id);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket is not connected");
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }
}

// Singleton instance
let globalManager: GlobalWebSocketManager | null = null;

export function getGlobalWebSocketManager(): GlobalWebSocketManager {
  if (!globalManager && typeof window !== "undefined") {
    globalManager = new GlobalWebSocketManager();
  }
  return globalManager!;
}

// React Hook
import { useEffect, useState, useRef } from "react";

export interface UseGlobalWebSocketOptions {
  /** Event types to filter for */
  eventTypes?: WebSocketEventType[];
  /** Session ID to filter events for */
  sessionId?: string;
  /** Enabled state (allows conditional usage) */
  enabled?: boolean;
}

export interface UseGlobalWebSocketReturn<T = unknown> {
  status: ConnectionStatus;
  lastEvent: WebSocketEvent<T> | null;
  events: WebSocketEvent<T>[];
  send: (data: unknown) => void;
  clearEvents: () => void;
}

const MAX_EVENTS_BUFFER = 100;

export function useGlobalWebSocket<T = unknown>(
  options: UseGlobalWebSocketOptions = {}
): UseGlobalWebSocketReturn<T> {
  const { eventTypes, sessionId, enabled = true } = options;
  
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<WebSocketEvent<T> | null>(null);
  const [events, setEvents] = useState<WebSocketEvent<T>[]>([]);
  
  const subscriberIdRef = useRef(`sub_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!enabled) return;

    const manager = getGlobalWebSocketManager();
    const id = subscriberIdRef.current;

    // Subscribe to status updates
    const unsubscribeStatus = manager.subscribeStatus(id, setStatus);

    // Subscribe to events
    const unsubscribeEvents = manager.subscribe(id, (event) => {
      // Filter by event type
      if (eventTypes && !eventTypes.includes(event.type)) {
        return;
      }

      // Filter by session ID
      if (sessionId && event.sessionId !== sessionId) {
        return;
      }

      setLastEvent(event as WebSocketEvent<T>);
      setEvents((prev) => {
        const newEvents = [event as WebSocketEvent<T>, ...prev];
        return newEvents.slice(0, MAX_EVENTS_BUFFER);
      });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeEvents();
    };
  }, [eventTypes, sessionId, enabled]);

  const send = (data: unknown) => {
    const manager = getGlobalWebSocketManager();
    manager.send(data);
  };

  const clearEvents = () => {
    setEvents([]);
    setLastEvent(null);
  };

  return {
    status,
    lastEvent,
    events,
    send,
    clearEvents,
  };
}

// Specialized Hooks

export function useLiveCallFeed() {
  return useGlobalWebSocket({
    eventTypes: ["active_calls_update", "call_started", "call_ended", "escalation"],
  });
}

export function useActiveCalls() {
  const { lastEvent } = useLiveCallFeed();
  const [activeCalls, setActiveCalls] = useState<any[]>([]);

  useEffect(() => {
    if (lastEvent && lastEvent.type === "active_calls_update") {
      const data = lastEvent.data as any;
      // Handle both data.data and direct data formats
      const callsArray = data.data || data || [];
      setActiveCalls(callsArray);
    }
  }, [lastEvent]);

  return activeCalls;
}

export function useCallSession(sessionId: string, enabled = true) {
  return useGlobalWebSocket({
    eventTypes: [
      "active_calls_update",
      "transcript_update",
      "form_update",
      "call_updated",
      "call_ended",
      "final_transcript",
      "speak_action",
      "system_state"
    ],
    sessionId,
    enabled: enabled && !!sessionId,
  });
}

export function useComplaintUpdates() {
  return useGlobalWebSocket({
    eventTypes: ["complaint_created", "complaint_updated"],
  });
}

export function useSystemAlerts() {
  return useGlobalWebSocket({
    eventTypes: ["system_alert", "escalation", "call_started", "call_ended", "case_created"],
  });
}
