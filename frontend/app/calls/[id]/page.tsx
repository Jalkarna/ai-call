
"use client";

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlayCircle, Clock, Globe, MessageSquare, AlertTriangle } from "lucide-react";
import { MOCK_CALLS } from "@/lib/mock-data";

export default function CallDetailPage({ params }: { params: { id: string } }) {
  let call = MOCK_CALLS.find(c => c.id === params.id);
  // Fallback for demo
  if (!call && MOCK_CALLS.length > 0) call = MOCK_CALLS[0];

  if (!call) return notFound();

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
             <div className="space-y-1">
                 <p className="text-sm text-muted-foreground">
                   ID: {call.id} • {format(new Date(call.timestamp), "MMM d, yyyy h:mm a")}
                </p>
            </div>
             <Button variant="destructive" size="sm" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Flag for Review
            </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
             <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Transcript Analysis</CardTitle>
                    <CardDescription>AI-generated transcript and intent detection.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border p-4 bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                             <PlayCircle className="h-5 w-5 text-primary" />
                             <div className="h-1 flex-1 bg-muted-foreground/20 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-primary" />
                             </div>
                             <span className="text-xs font-medium">{call.duration}</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Audio Recording</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <span className="text-sm font-bold min-w-[60px]">AI:</span>
                            <p className="text-sm text-muted-foreground">Namaste. Welcome to Vadodara Municipal Corporation. How can I assist you today?</p>
                        </div>
                         <div className="flex gap-4">
                            <span className="text-sm font-bold min-w-[60px]">User:</span>
                            <p className="text-sm">
                                {call.intent === "Garbage Collection" ? "Garbage has not been collected in my area for two days." : "I need to report an issue in my area."}
                            </p>
                        </div>
                         <div className="flex gap-4">
                            <span className="text-sm font-bold min-w-[60px]">AI:</span>
                            <p className="text-sm text-muted-foreground">I understand. Can you please confirm your location?</p>
                        </div>
                         <div className="flex gap-4">
                             <span className="text-sm font-bold min-w-[60px]">User:</span>
                             <p className="text-sm">{call.location}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Metadata</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                     <div className="grid gap-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Duration
                        </div>
                        <span className="font-semibold">{call.duration}</span>
                    </div>
                     <div className="grid gap-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Globe className="h-4 w-4" />
                            Language
                        </div>
                        <span className="font-semibold">{call.language}</span>
                    </div>
                    <div className="grid gap-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <MessageSquare className="h-4 w-4" />
                            Intent
                        </div>
                         <Badge variant="outline" className="w-fit">
                            {call.intent}
                         </Badge>
                    </div>
                    <Separator />
                     <div className="grid gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Sentiment Score</span>
                         <div className="flex items-center gap-2 mt-1">
                            <span className={`text-lg font-bold ${call.sentiment === "Negative" || call.sentiment === "Frustrated" ? "text-destructive" : "text-green-600"}`}>
                                {call.sentiment}
                            </span>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
