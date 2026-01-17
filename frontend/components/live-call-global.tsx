"use client";

import { useEffect, useState } from "react";
import { LiveCallNotifications } from "./live-call-notification";
import { useActiveCalls } from "@/lib/websocket";

interface LiveCall {
  sessionId: string;
  callerId: string;
  status: 'listening' | 'thinking' | 'speaking' | 'idle';
  startedAt: string;
  transcriptCount?: number;
}

export function LiveCallsGlobalNotifications() {
  const activeCalls = useActiveCalls();
  const [liveCallsData, setLiveCallsData] = useState<LiveCall[]>([]);

  useEffect(() => {
    if (activeCalls && Array.isArray(activeCalls)) {
      const calls = activeCalls.map((call: any) => ({
        sessionId: call.session_id || call.sessionId || call.id,
        callerId: call.caller || call.caller_number || "Unknown",
        status: (call.status || call.state || 'idle') as LiveCall['status'],
        startedAt: call.started_at || call.start_time || new Date().toISOString(),
        transcriptCount: call.transcript_count || 0,
      }));
      setLiveCallsData(calls);
    }
  }, [activeCalls]);

  return <LiveCallNotifications calls={liveCallsData} />;
}
