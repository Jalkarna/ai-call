"use client";

import { LiveCallsGlobalNotifications } from "@/components/live-call-global";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LiveCallsGlobalNotifications />
    </>
  );
}
