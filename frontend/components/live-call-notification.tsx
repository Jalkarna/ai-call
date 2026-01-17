"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mic, BrainCircuit, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface LiveCall {
  sessionId: string;
  callerId: string;
  status: 'listening' | 'thinking' | 'speaking' | 'idle';
  startedAt: string;
  transcriptCount?: number;
}

interface LiveCallNotificationProps {
  call: LiveCall;
  onDismiss: () => void;
}

export function LiveCallNotification({ call, onDismiss }: LiveCallNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  useEffect(() => {
    // Update duration every second
    const interval = setInterval(() => {
      const start = new Date(call.startedAt).getTime();
      const now = Date.now();
      setDuration(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [call.startedAt]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (call.status) {
      case 'listening':
        return <Mic className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'thinking':
        return <BrainCircuit className="h-4 w-4 text-purple-500 animate-pulse" />;
      case 'speaking':
        return <Volume2 className="h-4 w-4 text-green-500 animate-bounce" />;
      default:
        return <Phone className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusText = () => {
    switch (call.status) {
      case 'listening':
        return 'Listening to caller...';
      case 'thinking':
        return 'AI is thinking...';
      case 'speaking':
        return 'AI is speaking';
      default:
        return 'Call active';
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
      )}
    >
      <Link href={`/calls/${call.sessionId}`}>
        <Card className="w-80 hover:shadow-lg transition-shadow cursor-pointer bg-card border-2 border-primary/20">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Live Call</h4>
                  <p className="text-xs text-muted-foreground">{call.callerId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-mono">
                  {formatDuration(duration)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDismiss();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {getStatusIcon()}
              <span className="text-muted-foreground">{getStatusText()}</span>
            </div>

            {call.transcriptCount !== undefined && call.transcriptCount > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {call.transcriptCount} messages exchanged
              </div>
            )}

            <div className="mt-3 text-xs text-primary font-medium">
              Click to view details →
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}

// Container for multiple live call notifications
export function LiveCallNotifications({ calls }: { calls: LiveCall[] }) {
  const [dismissedCalls, setDismissedCalls] = useState<Set<string>>(new Set());

  const visibleCalls = calls.filter(call => !dismissedCalls.has(call.sessionId));

  const handleDismiss = (sessionId: string) => {
    setDismissedCalls(prev => new Set(prev).add(sessionId));
  };

  return (
    <>
      {visibleCalls.map((call, index) => (
        <div
          key={call.sessionId}
          style={{
            transform: `translateY(-${index * 120}px)`,
          }}
        >
          <LiveCallNotification
            call={call}
            onDismiss={() => handleDismiss(call.sessionId)}
          />
        </div>
      ))}
    </>
  );
}
