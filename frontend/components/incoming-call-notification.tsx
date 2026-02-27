"use client";

import { useEffect, useState, useRef } from "react";
import { X, PhoneIncoming } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAudioManager } from "@/lib/audio";

interface IncomingCall {
  sessionId: string;
  callerId: string;
  status: 'listening' | 'thinking' | 'speaking' | 'idle';
  startedAt: string;
}

interface IncomingCallNotificationProps {
  call: IncomingCall;
  onDismiss: () => void;
}

export function IncomingCallNotification({ call, onDismiss }: IncomingCallNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [duration, setDuration] = useState(0);
  const hasPlayedSoundRef = useRef(false);

  // Play preloaded audio immediately on mount
  useEffect(() => {
    if (!hasPlayedSoundRef.current) {
      const audioManager = getAudioManager();
      audioManager.playNotification().catch(() => {
        // Silently handle autoplay rejection
      });
      hasPlayedSoundRef.current = true;
    }
    // No cleanup - audio will be stopped explicitly by user actions or when notification is removed
  }, []);

  // Slide in animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Update duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(call.startedAt).getTime();
      const now = Date.now();
      setDuration(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [call.startedAt]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    
    // Stop audio
    const audioManager = getAudioManager();
    audioManager.stopNotification();
    console.log("🔇 User dismissed - audio stopped");
    
    setTimeout(onDismiss, 300);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[9999] transition-all duration-300 ease-out pointer-events-auto",
        isVisible 
          ? "translate-x-0 opacity-100" 
          : "translate-x-[120%] opacity-0"
      )}
    >
      <div className="relative w-[360px]">
        {/* Main notification card - contained effects */}
        <div className="relative bg-card border border-border rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
          {/* Subtle top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                {/* Phone icon with subtle pulse */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10">
                  <PhoneIncoming className="h-5 w-5 text-emerald-500" />
                  
                  {/* Single subtle pulse ring inside */}
                  <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></span>
                </div>

                {/* Call info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Incoming Call
                    </h4>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {call.callerId}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mr-1.5 -mt-1.5 shrink-0"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Link to call details */}
            <Link 
              href={`/calls/${call.sessionId}`}
              className="block"
              onClick={() => {
                // Stop audio when navigating to call
                const audioManager = getAudioManager();
                audioManager.stopNotification();
                console.log("🔇 Navigating to call - audio stopped");
                // Auto-dismiss notification when navigating to details
                setIsVisible(false);
                setTimeout(onDismiss, 300);
              }}
            >
              {/* Duration and status */}
              <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background/80">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {formatDuration(duration)}
                    </span>
                  </div>
                  
                  <div className="px-2 py-1 rounded bg-emerald-500/10">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                      {call.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground font-medium">
                  View →
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Container for managing multiple incoming call notifications
export function IncomingCallNotifications({ calls }: { calls: IncomingCall[] }) {
  const [dismissedCalls, setDismissedCalls] = useState<Set<string>>(new Set());
  const prevCallsLengthRef = useRef(calls.length);

  const visibleCalls = calls.filter(call => !dismissedCalls.has(call.sessionId));

  const handleDismiss = (sessionId: string) => {
    setDismissedCalls(prev => new Set(prev).add(sessionId));
  };

  // Auto-dismiss when call is no longer in the active calls list
  useEffect(() => {
    setDismissedCalls(prev => {
      const newDismissed = new Set(prev);
      const currentSessionIds = new Set(calls.map(c => c.sessionId));
      
      // Remove dismissed calls that are no longer active
      prev.forEach(sessionId => {
        if (!currentSessionIds.has(sessionId)) {
          newDismissed.delete(sessionId);
        }
      });
      
      return newDismissed;
    });
  }, [calls]);

  // Stop audio when all calls end
  useEffect(() => {
    const hadCalls = prevCallsLengthRef.current > 0;
    const noCalls = calls.length === 0;
    
    if (hadCalls && noCalls) {
      console.log("🛑 All calls ended - stopping audio");
      const audioManager = getAudioManager();
      audioManager.stopNotification();
    }
    
    prevCallsLengthRef.current = calls.length;
  }, [calls.length]);

  if (visibleCalls.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {visibleCalls.map((call, index) => (
        <div
          key={call.sessionId}
          className="absolute"
          style={{
            bottom: `${24 + index * 100}px`,
            right: '24px',
          }}
        >
          <IncomingCallNotification
            call={call}
            onDismiss={() => handleDismiss(call.sessionId)}
          />
        </div>
      ))}
    </div>
  );
}
