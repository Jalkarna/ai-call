
"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Calendar, 
  User, 
  ArrowLeft,
  Phone,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";
import { MOCK_COMPLAINTS } from "@/lib/mock-data";
import { ConfidenceIndicator, ConfidenceBadge } from "@/components/confidence-indicator";

// Mock confidence scores for demo
const MOCK_CONFIDENCE_SCORES: Record<string, number> = {
  category: 0.92,
  location: 0.88,
  description: 0.85,
  urgency: 0.78,
};

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  
  let complaint = MOCK_COMPLAINTS.find(c => c.id === id);
  if (!complaint && MOCK_COMPLAINTS.length > 0) {
    complaint = MOCK_COMPLAINTS[0];
  }

  if (!complaint) return notFound();

  const handleFieldChange = (field: string, value: string) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // In production, this would call the API
    console.log("Saving fields:", editedFields);
    setIsEditing(false);
    setEditedFields({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedFields({});
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/complaints">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight">{complaint.ticketNumber}</span>
              <Badge variant={
                complaint.status === "Resolved" ? "default" :
                complaint.status === "In Progress" ? "secondary" : "outline"
              }>
                {complaint.status}
              </Badge>
              <Badge variant={complaint.urgency === "Critical" ? "destructive" : "secondary"}>
                {complaint.urgency}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Registered via Voice AI • {format(new Date(complaint.timestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Fields
              </Button>
              <StatusUpdateDialog 
                currentStatus={complaint.status}
                onUpdate={(status) => console.log("Update status:", status)}
              />
              <Button variant="outline">Print Summary</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Complaint Details */}
          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
              <CardDescription>
                AI-extracted information from the voice call
                {isEditing && " - Click on fields to edit"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Category</Label>
                  <ConfidenceBadge confidence={MOCK_CONFIDENCE_SCORES.category} />
                </div>
                {isEditing ? (
                  <Select 
                    value={editedFields.category || complaint.category}
                    onValueChange={(value) => handleFieldChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Garbage Collection">Garbage Collection</SelectItem>
                      <SelectItem value="Streetlight Issue">Streetlight Issue</SelectItem>
                      <SelectItem value="Water Supply">Water Supply</SelectItem>
                      <SelectItem value="Drainage/Sewage">Drainage/Sewage</SelectItem>
                      <SelectItem value="Road Repair">Road Repair</SelectItem>
                      <SelectItem value="Stray Animal">Stray Animal</SelectItem>
                      <SelectItem value="Illegal Encroachment">Illegal Encroachment</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{complaint.category}</p>
                )}
                <ConfidenceIndicator 
                  confidence={MOCK_CONFIDENCE_SCORES.category} 
                  showPercentage={false}
                  size="sm"
                />
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Urgency</Label>
                  <ConfidenceBadge confidence={MOCK_CONFIDENCE_SCORES.urgency} />
                </div>
                {isEditing ? (
                  <Select 
                    value={editedFields.urgency || complaint.urgency}
                    onValueChange={(value) => handleFieldChange("urgency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={complaint.urgency === "Critical" ? "destructive" : "secondary"} className="w-fit">
                    {complaint.urgency}
                  </Badge>
                )}
                <ConfidenceIndicator 
                  confidence={MOCK_CONFIDENCE_SCORES.urgency} 
                  showPercentage={false}
                  size="sm"
                />
              </div>

              {/* Location */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Location</Label>
                  <ConfidenceBadge confidence={MOCK_CONFIDENCE_SCORES.location} />
                </div>
                {isEditing ? (
                  <Input
                    value={editedFields.location || complaint.location}
                    onChange={(e) => handleFieldChange("location", e.target.value)}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{complaint.location}</span>
                  </div>
                )}
                <ConfidenceIndicator 
                  confidence={MOCK_CONFIDENCE_SCORES.location} 
                  showPercentage={false}
                  size="sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  <ConfidenceBadge confidence={MOCK_CONFIDENCE_SCORES.description} />
                </div>
                {isEditing ? (
                  <Textarea
                    value={editedFields.description || complaint.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {complaint.description}
                  </p>
                )}
                <ConfidenceIndicator 
                  confidence={MOCK_CONFIDENCE_SCORES.description} 
                  showPercentage={false}
                  size="sm"
                />
              </div>
            </CardContent>
            
            {isEditing && (
              <CardFooter className="bg-muted/30 border-t">
                <p className="text-xs text-muted-foreground">
                  Your corrections help improve AI accuracy. Changes are logged for audit purposes.
                </p>
              </CardFooter>
            )}
          </Card>

          {/* Contact & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment & Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Assigned To</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{complaint.assignedTo || "Unassigned"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Contact Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">+91 98765 43210</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-l-2 border-muted pl-6 space-y-6">
                <TimelineItem
                  icon={<FileText className="h-3 w-3" />}
                  title="Complaint Registered"
                  timestamp={format(new Date(complaint.timestamp), "MMM d, h:mm a")}
                  description="Registered via AI Voice Assistant"
                  isFirst
                />
                <TimelineItem
                  icon={<CheckCircle className="h-3 w-3" />}
                  title="AI Analysis Completed"
                  timestamp={format(new Date(complaint.timestamp), "MMM d, h:mm a")}
                  description="All fields extracted with high confidence"
                />
                {complaint.assignedTo && (
                  <TimelineItem
                    icon={<User className="h-3 w-3" />}
                    title="Assigned to Officer"
                    timestamp={format(new Date(), "MMM d, h:mm a")}
                    description={`Assigned to ${complaint.assignedTo}`}
                  />
                )}
                {complaint.status === "In Progress" && (
                  <TimelineItem
                    icon={<Clock className="h-3 w-3" />}
                    title="Work In Progress"
                    timestamp={format(new Date(), "MMM d, h:mm a")}
                    description="Field team dispatched"
                  />
                )}
                {complaint.status === "Resolved" && (
                  <TimelineItem
                    icon={<CheckCircle className="h-3 w-3" />}
                    title="Issue Resolved"
                    timestamp={format(new Date(), "MMM d, h:mm a")}
                    description="Marked as resolved by officer"
                    isLast
                    isSuccess
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Confidence Summary */}
          <Card>
            <CardHeader>
              <CardTitle>AI Confidence Summary</CardTitle>
              <CardDescription>Overall extraction accuracy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(MOCK_CONFIDENCE_SCORES).map(([field, confidence]) => (
                <div key={field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize">{field}</span>
                    <span className="text-sm font-medium">{Math.round(confidence * 100)}%</span>
                  </div>
                  <ConfidenceIndicator 
                    confidence={confidence}
                    showPercentage={false}
                    size="sm"
                  />
                </div>
              ))}
              <Separator />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall</span>
                  <span className="text-sm font-bold">86%</span>
                </div>
                <ConfidenceIndicator 
                  confidence={0.86}
                  showPercentage={false}
                  size="lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Source Call Link */}
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/calls/${complaint.id}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  View Original Call
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Timeline Item Component
interface TimelineItemProps {
  icon: React.ReactNode;
  title: string;
  timestamp: string;
  description?: string;
  isFirst?: boolean;
  isLast?: boolean;
  isSuccess?: boolean;
}

function TimelineItem({ 
  icon, 
  title, 
  timestamp, 
  description,
  isFirst,
  isLast,
  isSuccess 
}: TimelineItemProps) {
  return (
    <div className="relative">
      <div className={`absolute -left-[29px] top-1 h-3 w-3 rounded-full flex items-center justify-center ${
        isFirst ? "bg-primary" : isSuccess ? "bg-green-500" : "bg-muted border border-background"
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

// Status Update Dialog
interface StatusUpdateDialogProps {
  currentStatus: string;
  onUpdate: (status: string) => void;
}

function StatusUpdateDialog({ currentStatus, onUpdate }: StatusUpdateDialogProps) {
  const [status, setStatus] = useState(currentStatus);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Update Status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Complaint Status</DialogTitle>
          <DialogDescription>
            Change the current status of this complaint.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label>New Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button onClick={() => onUpdate(status)}>Update Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
