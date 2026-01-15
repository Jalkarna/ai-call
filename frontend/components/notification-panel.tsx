/**
 * Notification Panel Component
 * 
 * Displays real-time alerts and notifications from the system,
 * including escalations, urgent complaints, and system events.
 */

"use client";

import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Phone, FileText, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSystemAlerts } from "@/lib/websocket";
import type { WebSocketEvent, EscalationEvent } from "@/lib/types";

export interface Notification {
  id: string;
  type: "escalation" | "complaint" | "system" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: unknown;
}

// Mock notifications for demo - in production, these come from WebSocket
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "escalation",
    title: "Call Escalation Required",
    message: "Caller at +91 98*** **456 has requested human assistance.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "2",
    type: "complaint",
    title: "Critical Complaint Filed",
    message: "Drainage overflow reported at Alkapuri - marked as Critical.",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "3",
    type: "system",
    title: "High Call Volume",
    message: "Call volume is 30% higher than usual. Consider additional capacity.",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: true,
  },
];

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  
  // Subscribe to real-time alerts
  const { lastEvent } = useSystemAlerts();
  
  // Handle incoming WebSocket events
  useEffect(() => {
    if (lastEvent) {
      const newNotification = eventToNotification(lastEvent);
      if (newNotification) {
        setNotifications((prev) => [newNotification, ...prev]);
      }
    }
  }, [lastEvent]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "escalation":
        return <Phone className="h-4 w-4 text-orange-500" />;
      case "complaint":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "system":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
          <SheetDescription>
            Real-time alerts and system notifications
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    notification.read
                      ? "bg-background"
                      : "bg-muted/50 border-primary/20"
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helper function to convert WebSocket events to notifications
function eventToNotification(event: WebSocketEvent): Notification | null {
  const id = `${event.type}-${Date.now()}`;
  
  switch (event.type) {
    case "escalation":
      const escData = event.data as EscalationEvent;
      return {
        id,
        type: "escalation",
        title: "Call Escalation Required",
        message: `Caller at ${escData.callerNumber} needs assistance. Reason: ${escData.reason}`,
        timestamp: event.timestamp,
        read: false,
        data: escData,
      };
    
    case "system_alert":
      return {
        id,
        type: "system",
        title: "System Alert",
        message: String(event.data),
        timestamp: event.timestamp,
        read: false,
      };
    
    default:
      return null;
  }
}
