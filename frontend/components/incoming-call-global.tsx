"use client";

import { useEffect, useState } from "react";
import { IncomingCallNotifications } from "./incoming-call-notification";
import { useActiveCalls } from "@/lib/websocket";

interface IncomingCall {
  sessionId: string;
  callerId: string;
  status: 'listening' | 'thinking' | 'speaking' | 'idle';
  startedAt: string;
}

export function IncomingCallGlobalNotifications() {
  const activeCalls = useActiveCalls();
  const [incomingCallsData, setIncomingCallsData] = useState<IncomingCall[]>([]);

  useEffect(() => {
    if (activeCalls && Array.isArray(activeCalls)) {
      const calls = activeCalls.map((call: any) => ({
        sessionId: call.session_id || call.sessionId || call.id,
        callerId: call.caller || call.caller_number || "Unknown Caller",
        status: (call.status || call.state || 'idle') as IncomingCall['status'],
        startedAt: call.started_at || call.start_time || new Date().toISOString(),
      }));
      setIncomingCallsData(calls);
    } else {
      setIncomingCallsData([]);
    }
  }, [activeCalls]);

  return <IncomingCallNotifications calls={incomingCallsData} />;
}
