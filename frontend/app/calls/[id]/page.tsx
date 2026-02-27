"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  RefreshCw,
  UserPlus,
  Flag,
  BrainCircuit,
  Volume2,
  Mic,
  PhoneOff,
  CheckCircle
} from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { TranscriptTimeline } from "@/components/transcript-timeline";
import { useCallDetail } from "@/lib/hooks";
import { useCallSession } from "@/lib/websocket";
import { TranscriptEntry } from "@/lib/types";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Fetch initial call data
  const { data: call, isLoading } = useCallDetail(id);

  // Real-time updates
  const { lastEvent } = useCallSession(id);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [extractedFields, setExtractedFields] = useState<Record<string, any>>({});
  const [activeStatus, setActiveStatus] = useState<string>('');
  const [systemState, setSystemState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [callEnded, setCallEnded] = useState(false);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);

  // Initialize state from existing call data
  useEffect(() => {
    if (call) {
      setTranscript(call.transcript || []);
      setExtractedFields(call.extractedFields || {});
      setActiveStatus(call.status);
    }
  }, [call]);

  // Handle real-time events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'final_transcript') {
      const data = lastEvent.data as any;
      setTranscript(prev => [...prev, {
        timestamp: new Date().toISOString(),
        speaker: 'Caller',
        role: 'user',
        text: data.text,
        isFinal: true,
        confidence: data.confidence
      }]);
    }

    if (lastEvent.type === 'speak_action') {
      const data = lastEvent.data as any;
      setTranscript(prev => [...prev, {
        timestamp: new Date().toISOString(),
        speaker: 'AI Agent',
        role: 'assistant',
        text: data.tts_text,
        isFinal: true,
        confidence: 1.0
      }]);
    }

    if (lastEvent.type === 'form_update') {
      const data = lastEvent.data as any;
      setExtractedFields(data.form);
    }

    if (lastEvent.type === 'system_state') {
      const data = lastEvent.data as any;
      setSystemState(data.state);
    }

    if (lastEvent.type === 'call_ended') {
      const data = lastEvent.data as any;
      setActiveStatus('completed');
      setSystemState('idle');
      setCallEnded(true);
      setEndedAt(data.end_time || new Date().toISOString());
      setDuration(data.duration_seconds || 0);
    }
  }, [lastEvent]);

  if (isLoading) {
    return <div className="p-8">Loading call details...</div>;
  }

  if (!call) return notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/calls">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Call Details</h1>
              <Badge variant={callEnded ? "default" : call.status === "dropped" ? "destructive" : "secondary"}
                     className={callEnded ? "bg-green-600" : ""}>
                {callEnded ? "completed" : activeStatus || call.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ID: {call.id} • {call.calledAt ? format(new Date(call.calledAt), "MMM d, yyyy h:mm a") : 'Unknown'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Replay requested")}>
            <RefreshCw className="h-4 w-4" />
            Replay
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Assigned to you")}>
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.warning("Call flagged for escalation")}>
            <Flag className="h-4 w-4" />
            Escalate
          </Button>
        </div>
      </div>

      {/* Live Status Card - Show for active calls or just-ended calls */}
      {(call.status === 'active' || callEnded) && (
        <Card className={callEnded ? "bg-green-500/10 border-green-500/30 mb-6" : "bg-primary/5 mb-6"}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 font-medium">
              {callEnded ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">Call Ended Successfully</span>
                </>
              ) : (
                <>
                  {systemState === 'thinking' && <><BrainCircuit className="h-5 w-5 animate-pulse text-primary" /> AI is Thinking...</>}
                  {systemState === 'speaking' && <><Volume2 className="h-5 w-5 animate-bounce text-green-600" /> AI is Speaking</>}
                  {systemState === 'listening' && <><Mic className="h-5 w-5 text-blue-500" /> Listening to user...</>}
                  {(systemState === 'idle' || !systemState) && <span className="text-muted-foreground">Session Active</span>}
                </>
              )}
            </div>
            {callEnded && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Duration: {Math.floor(duration / 60)}m {duration % 60}s</span>
                {endedAt && <span>Ended: {format(new Date(endedAt), "h:mm:ss a")}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Transcript & Audio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player - Hide if active */}
          {call.status !== 'active' && call.recordingUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Call Recording</CardTitle>
                <CardDescription>Audio recording of the call session</CardDescription>
              </CardHeader>
              <CardContent>
                <AudioPlayer
                  title={`Call ${call.id}`}
                  duration={call.durationSeconds || 0}
                  src={call.recordingUrl}
                />
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                {call.status === 'active' ? 'Live transcript' : 'AI-generated transcript'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TranscriptTimeline
                entries={transcript}
                height="400px"
                autoScroll={call.status === 'active'}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Metadata & Extracted Fields */}
        <div className="space-y-6">
          {/* Extracted Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Fields</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {Object.entries(extractedFields)
                .filter(([key]) => !['missing_fields', 'confidence_scores'].includes(key)) // Filter out internal fields
                .map(([key, value]) => {
                  // Format the value based on type
                  let displayValue: string;
                  if (value === null || value === undefined) {
                    displayValue = '-';
                  } else if (typeof value === 'object') {
                    // For objects like confidence_scores, format nicely
                    displayValue = Object.entries(value as Record<string, number>)
                      .map(([k, v]) => `${k}: ${typeof v === 'number' ? Math.round(v * 100) + '%' : v}`)
                      .join(', ');
                  } else {
                    displayValue = String(value);
                  }
                  
                  return (
                    <div key={key}>
                      <span className="text-sm font-medium text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="font-medium">{displayValue}</div>
                    </div>
                  );
                })}
              {Object.keys(extractedFields).filter(k => !['missing_fields', 'confidence_scores'].includes(k)).length === 0 && (
                <div className="text-muted-foreground text-sm">No fields extracted yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
