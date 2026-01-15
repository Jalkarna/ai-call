/**
 * Transcript Timeline Component
 * 
 * Displays a conversation transcript with timestamps,
 * speaker identification, and partial/final transcript markers.
 */

"use client";

import { useEffect, useRef } from "react";
import { User, Bot, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/lib/types";

export interface TranscriptTimelineProps {
  /** Array of transcript entries */
  entries: TranscriptEntry[];
  /** Whether to auto-scroll to latest entry */
  autoScroll?: boolean;
  /** Height of the timeline container */
  height?: string;
  /** Callback when an entry is clicked */
  onEntryClick?: (entry: TranscriptEntry, index: number) => void;
  /** Currently highlighted entry index */
  highlightedIndex?: number;
  /** Custom class name */
  className?: string;
}

export function TranscriptTimeline({
  entries,
  autoScroll = true,
  height = "400px",
  onEntryClick,
  highlightedIndex,
  className,
}: TranscriptTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoScroll]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (entries.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No transcript available</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("pr-4", className)} style={{ height }}>
      <div ref={scrollRef} className="space-y-4 py-2">
        {entries.map((entry, index) => (
          <div
            key={`${entry.timestamp}-${index}`}
            className={cn(
              "flex gap-3 p-3 rounded-lg transition-colors cursor-pointer",
              entry.speaker === "ai" ? "bg-primary/5" : "bg-muted/50",
              highlightedIndex === index && "ring-2 ring-primary",
              !entry.isFinal && "opacity-70"
            )}
            onClick={() => onEntryClick?.(entry, index)}
          >
            {/* Speaker Icon */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              entry.speaker === "ai" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted-foreground/20"
            )}>
              {entry.speaker === "ai" ? (
                <Bot className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {entry.speaker === "ai" ? "AI Assistant" : "Caller"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(entry.timestamp)}
                </span>
                {!entry.isFinal && (
                  <Badge variant="outline" className="text-xs">
                    Partial
                  </Badge>
                )}
                {entry.confidence !== undefined && entry.confidence < 0.7 && (
                  <Badge variant="secondary" className="text-xs">
                    Low confidence
                  </Badge>
                )}
              </div>
              <p className={cn(
                "text-sm leading-relaxed",
                !entry.isFinal && "italic"
              )}>
                {entry.text}
              </p>
              {entry.confidence !== undefined && (
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">
                    Confidence: {Math.round(entry.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

/**
 * Live Transcript Indicator
 * Shows a pulsing indicator for live transcription
 */
export function LiveTranscriptIndicator({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <span>Live transcription</span>
    </div>
  );
}

/**
 * Compact Transcript View - For dashboard preview
 */
export interface CompactTranscriptProps {
  entries: TranscriptEntry[];
  maxEntries?: number;
  className?: string;
}

export function CompactTranscript({
  entries,
  maxEntries = 3,
  className,
}: CompactTranscriptProps) {
  const displayEntries = entries.slice(-maxEntries);

  return (
    <div className={cn("space-y-2", className)}>
      {displayEntries.map((entry, index) => (
        <div key={`${entry.timestamp}-${index}`} className="flex gap-2 items-start">
          <span className={cn(
            "text-xs font-medium min-w-[40px]",
            entry.speaker === "ai" ? "text-primary" : "text-muted-foreground"
          )}>
            {entry.speaker === "ai" ? "AI:" : "User:"}
          </span>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {entry.text}
          </p>
        </div>
      ))}
    </div>
  );
}
