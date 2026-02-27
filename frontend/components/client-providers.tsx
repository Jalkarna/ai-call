"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { IncomingCallGlobalNotifications } from "@/components/incoming-call-global";
import { getAudioManager } from "@/lib/audio";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // Preload audio as soon as app loads
  useEffect(() => {
    // Initialize audio manager immediately
    getAudioManager();
  }, []);

  return (
    <AuthProvider>
      {children}
      <IncomingCallGlobalNotifications />
    </AuthProvider>
  );
}
