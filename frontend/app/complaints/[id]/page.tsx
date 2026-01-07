
"use client";

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, User, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { MOCK_COMPLAINTS } from "@/lib/mock-data";

export default function ComplaintDetailPage({ params }: { params: { id: string } }) {
  // In a real app, you would fetch this data
  // Since we are using mock data with random IDs that change on server restart/re-render if not careful,
  // we will just grab the first one if we can't find it or for this demo usage.
  // Ideally, use a static set of IDs for navigation in a demo.
  
  // For the purpose of this "build NOW" demo, let's just use the first mock complaint 
  // if exact match fails, or rely on the user clicking from the list which has valid IDs.
  // However, since MOCK_COMPLAINTS are generated at runtime, the IDs in the URL might NOT match
  // what's currently in memory on a fresh page load if `mock-data.ts` re-evaluates.
  // To solve this for a *persistent* feel without a DB, we should have used seed data.
  // For now, we will fallback to the first item for demonstration if not found.
  
  let complaint = MOCK_COMPLAINTS.find(c => c.id === params.id);
  // Fallback for demo stability if ID generation causes issues across navigations
  if (!complaint && MOCK_COMPLAINTS.length > 0) {
      complaint = MOCK_COMPLAINTS[0]; 
  }

  if (!complaint) return notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <span className="text-2xl font-bold tracking-tight">{complaint.ticketNumber}</span>
            <p className="text-sm text-muted-foreground">
                Registered via Voice AI
            </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Print Summary</Button>
          <Button>Update Status</Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
             <CardHeader>
                <CardTitle>Complaint Details</CardTitle>
                <CardDescription>Comprehensive view of the reported issue.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div className="grid gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Category</span>
                        <span className="font-semibold">{complaint.category}</span>
                    </div>
                    <div className="grid gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Urgency</span>
                         <Badge variant={complaint.urgency === "Critical" ? "destructive" : "secondary"} className="w-fit">
                            {complaint.urgency}
                        </Badge>
                    </div>
                     <div className="grid gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Current Status</span>
                         <Badge variant={complaint.status === "Resolved" ? "default" : "outline"} className="w-fit">
                            {complaint.status}
                        </Badge>
                    </div>
                </div>
                 <div className="space-y-4">
                    <div className="grid gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Location</span>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{complaint.location}</span>
                        </div>
                    </div>
                    <div className="grid gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Reported Time</span>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(complaint.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                    </div>
                     <div className="grid gap-1">
                        <span className="text-sm font-medium text-muted-foreground">Assigned To</span>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{complaint.assignedTo || "Unassigned"}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
             <Separator className="my-4" />
             <CardFooter className="flex flex-col items-start gap-4">
                <div className="grid gap-1">
                    <span className="text-sm font-medium text-muted-foreground">Description (AI Extracted)</span>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {complaint.description}
                    </p>
                </div>
             </CardFooter>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="border-l-2 border-muted pl-6 space-y-6">
                    <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary" />
                        <p className="text-sm font-medium">Complaint Registered</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(complaint.timestamp), "MMM d, h:mm a")}</p>
                    </div>
                     <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-muted border border-background" />
                        <p className="text-sm font-medium">AI Analysis Completed</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(complaint.timestamp), "MMM d, h:mm a")}</p>
                    </div>
                    {complaint.status === "Resolved" && (
                         <div className="relative">
                            <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-green-500" />
                            <p className="text-sm font-medium">Issue Resolved</p>
                             <p className="text-xs text-muted-foreground">{format(new Date(), "MMM d, h:mm a")}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
