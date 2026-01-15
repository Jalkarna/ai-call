/**
 * Human Takeover Modal Component
 * 
 * Modal dialog for operators to take over an AI-handled call,
 * displaying call context and providing transfer controls.
 */

"use client";

import { useState } from "react";
import { Phone, User, MapPin, FileText, AlertTriangle, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { callsApi } from "@/lib/api";

export interface TakeoverModalProps {
  callId: string;
  sessionId: string;
  callerNumber: string;
  currentIntent?: string;
  language?: string;
  sentiment?: string;
  extractedFields?: Record<string, unknown>;
  trigger?: React.ReactNode;
  onTakeoverComplete?: () => void;
}

export function TakeoverModal({
  callId,
  sessionId,
  callerNumber,
  currentIntent,
  language = "Hindi",
  sentiment = "Neutral",
  extractedFields = {},
  trigger,
  onTakeoverComplete,
}: TakeoverModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [takeoverReason, setTakeoverReason] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");

  const handleTakeover = async () => {
    setIsLoading(true);
    try {
      await callsApi.takeover(callId);
      onTakeoverComplete?.();
      setIsOpen(false);
    } catch (error) {
      console.error("Takeover failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalate = async () => {
    setIsLoading(true);
    try {
      await callsApi.escalate(callId, takeoverReason);
      onTakeoverComplete?.();
      setIsOpen(false);
    } catch (error) {
      console.error("Escalation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "positive":
        return "text-green-500";
      case "negative":
      case "frustrated":
        return "text-red-500";
      default:
        return "text-yellow-500";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm" className="gap-2">
            <Headphones className="h-4 w-4" />
            Take Over Call
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Human Takeover Control
          </DialogTitle>
          <DialogDescription>
            Review call context and take control of this conversation from the AI.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Call Context */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <h4 className="text-sm font-semibold mb-3">Call Context</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Caller</p>
                  <p className="text-sm font-medium">{callerNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Intent</p>
                  <p className="text-sm font-medium">{currentIntent || "Unknown"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Language</p>
                <Badge variant="outline" className="mt-1">{language}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sentiment</p>
                <span className={`text-sm font-medium ${getSentimentColor(sentiment)}`}>
                  {sentiment}
                </span>
              </div>
            </div>
          </div>

          {/* Extracted Fields */}
          {Object.keys(extractedFields).length > 0 && (
            <div className="rounded-lg border p-4">
              <h4 className="text-sm font-semibold mb-3">Extracted Information</h4>
              <div className="grid gap-2">
                {Object.entries(extractedFields).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Takeover Reason */}
          <div className="grid gap-2">
            <Label htmlFor="reason">Takeover Reason</Label>
            <Select value={takeoverReason} onValueChange={setTakeoverReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason for takeover" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="caller_request">Caller Requested Human</SelectItem>
                <SelectItem value="complex_issue">Complex Issue</SelectItem>
                <SelectItem value="frustrated_caller">Frustrated Caller</SelectItem>
                <SelectItem value="ai_confusion">AI Confusion/Errors</SelectItem>
                <SelectItem value="emergency">Emergency Situation</SelectItem>
                <SelectItem value="quality_check">Quality Check</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Operator Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about the takeover..."
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-600">Important</p>
              <p className="text-muted-foreground">
                Taking over will pause AI processing. You will be connected directly with the caller.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleEscalate}
            disabled={isLoading || !takeoverReason}
          >
            Escalate Only
          </Button>
          <Button
            variant="destructive"
            onClick={handleTakeover}
            disabled={isLoading || !takeoverReason}
          >
            {isLoading ? "Connecting..." : "Take Over Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
