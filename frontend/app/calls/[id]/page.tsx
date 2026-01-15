"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Globe, 
  MessageSquare, 
  AlertTriangle, 
  ArrowLeft,
  UserPlus,
  Flag,
  RefreshCw
} from "lucide-react";
import { MOCK_CALLS } from "@/lib/mock-data";
import { AudioPlayer } from "@/components/audio-player";
import { TranscriptTimeline } from "@/components/transcript-timeline";
import { ConfidenceIndicator, FieldWithConfidence } from "@/components/confidence-indicator";
import { TakeoverModal } from "@/components/takeover-modal";
import type { TranscriptEntry } from "@/lib/types";
import Link from "next/link";

// Mock transcript for demo
const MOCK_TRANSCRIPT: TranscriptEntry[] = [
  {
    timestamp: new Date(Date.now() - 180000).toISOString(),
    speaker: "ai",
    text: "नमस्ते। वडोदरा नगर निगम में आपका स्वागत है। मैं आपकी कैसे सहायता कर सकती हूं?",
    isFinal: true,
    confidence: 1.0,
  },
  {
    timestamp: new Date(Date.now() - 160000).toISOString(),
    speaker: "user",
    text: "हमारे एरिया में दो दिन से कचरा नहीं उठाया गया है।",
    isFinal: true,
    confidence: 0.92,
  },
  {
    timestamp: new Date(Date.now() - 140000).toISOString(),
    speaker: "ai",
    text: "मुझे खेद है यह सुनकर। कृपया अपना पूरा पता बताएं।",
    isFinal: true,
    confidence: 1.0,
  },
  {
    timestamp: new Date(Date.now() - 120000).toISOString(),
    speaker: "user",
    text: "12 एमजी रोड, सयाजीगंज, वडोदरा",
    isFinal: true,
    confidence: 0.88,
  },
  {
    timestamp: new Date(Date.now() - 100000).toISOString(),
    speaker: "ai",
    text: "धन्यवाद। कृपया अपना मोबाइल नंबर बताएं।",
    isFinal: true,
    confidence: 1.0,
  },
  {
    timestamp: new Date(Date.now() - 80000).toISOString(),
    speaker: "user",
    text: "9825012345",
    isFinal: true,
    confidence: 0.95,
  },
  {
    timestamp: new Date(Date.now() - 60000).toISOString(),
    speaker: "ai",
    text: "आपकी शिकायत दर्ज हो गई है। आपका टिकट नंबर है VMC-2024015। धन्यवाद।",
    isFinal: true,
    confidence: 1.0,
  },
];

// Mock extracted fields for demo
const MOCK_EXTRACTED_FIELDS = {
  address: { value: "12 MG Road, Sayajiganj, Vadodara", confidence: 0.88 },
  contact_number: { value: "+91 98250 12345", confidence: 0.95 },
  complaint_type: { value: "Garbage Collection", confidence: 0.92 },
  description: { value: "Garbage not collected for 2 days", confidence: 0.85 },
};

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  let call = MOCK_CALLS.find(c => c.id === id);
  // Fallback for demo
  if (!call && MOCK_CALLS.length > 0) call = MOCK_CALLS[0];

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
              <Badge variant={call.status === "Dropped" ? "destructive" : "secondary"}>
                {call.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ID: {call.id} • {format(new Date(call.timestamp), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Replay
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Flag className="h-4 w-4" />
            Escalate
          </Button>
          <TakeoverModal
            callId={call.id}
            sessionId={`session_${call.id}`}
            callerNumber={call.callerId}
            currentIntent={call.intent}
            language={call.language}
            sentiment={call.sentiment}
            extractedFields={{
              address: MOCK_EXTRACTED_FIELDS.address.value,
              contact: MOCK_EXTRACTED_FIELDS.contact_number.value,
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Transcript & Audio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player */}
          <Card>
            <CardHeader>
              <CardTitle>Call Recording</CardTitle>
              <CardDescription>Audio recording of the call session</CardDescription>
            </CardHeader>
            <CardContent>
              <AudioPlayer
                title={`Call ${call.id}`}
                duration={180} // 3 minutes mock duration
              />
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>AI-generated transcript of the conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <TranscriptTimeline
                entries={MOCK_TRANSCRIPT}
                height="400px"
                autoScroll={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Metadata & Extracted Fields */}
        <div className="space-y-6">
          {/* Call Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Call Information</CardTitle>
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
                <span className="text-sm font-medium text-muted-foreground">Sentiment</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-lg font-bold ${
                    call.sentiment === "Negative" || call.sentiment === "Frustrated" 
                      ? "text-destructive" 
                      : call.sentiment === "Positive"
                        ? "text-green-600"
                        : "text-yellow-600"
                  }`}>
                    {call.sentiment}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Fields with Confidence */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Fields</CardTitle>
              <CardDescription>AI-extracted information with confidence scores</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FieldWithConfidence
                label="Address"
                value={MOCK_EXTRACTED_FIELDS.address.value}
                confidence={MOCK_EXTRACTED_FIELDS.address.confidence}
                editable
                onEdit={() => console.log("Edit address")}
              />
              <FieldWithConfidence
                label="Contact Number"
                value={MOCK_EXTRACTED_FIELDS.contact_number.value}
                confidence={MOCK_EXTRACTED_FIELDS.contact_number.confidence}
                editable
                onEdit={() => console.log("Edit contact")}
              />
              <FieldWithConfidence
                label="Complaint Type"
                value={MOCK_EXTRACTED_FIELDS.complaint_type.value}
                confidence={MOCK_EXTRACTED_FIELDS.complaint_type.confidence}
                editable
                onEdit={() => console.log("Edit type")}
              />
              <FieldWithConfidence
                label="Description"
                value={MOCK_EXTRACTED_FIELDS.description.value}
                confidence={MOCK_EXTRACTED_FIELDS.description.confidence}
                editable
                onEdit={() => console.log("Edit description")}
              />
              
              <Separator />
              
              <div>
                <span className="text-sm font-medium text-muted-foreground">Overall Confidence</span>
                <ConfidenceIndicator 
                  confidence={0.90}
                  fieldName="Overall"
                  size="lg"
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="w-full justify-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Flag for Review
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                View Linked Complaint
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                Download Transcript
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
