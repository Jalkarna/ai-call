
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModeToggle } from "@/components/mode-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div className="w-full">
      <Tabs defaultValue="general" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                    <CardDescription>
                        Manage AI model parameters and system thresholds.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="language">Default Output Language</Label>
                    <Select defaultValue="en">
                    <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="gu">Gujarati</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="threshold">Complaint Urgency Threshold</Label>
                    <Select defaultValue="high">
                    <SelectTrigger id="threshold">
                        <SelectValue placeholder="Select threshold" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                    </Select>
                    <p className="text-[0.8rem] text-muted-foreground">
                    Complaints above this level will trigger automated alerts.
                    </p>
                </div>
                </CardContent>
                <CardFooter>
                     <Button>Save System Changes</Button>
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
            <Card>
                <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                    Configure how you receive alerts and system updates.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="critical_alerts" className="flex flex-col space-y-1">
                    <span>Critical Alerts</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                        Receive immediate notifications for critical complaints.
                    </span>
                    </Label>
                    <Switch id="critical_alerts" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="daily_digest" className="flex flex-col space-y-1">
                    <span>Daily Digest</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                        Receive a daily summary of call center activity.
                    </span>
                    </Label>
                    <Switch id="daily_digest" />
                </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
            <Card>
                <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                    Customize the look and feel of the dashboard.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="theme" className="flex flex-col space-y-1">
                    <span>Theme Mode</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                        Toggle between Light and Dark themes.
                    </span>
                    </Label>
                    <ModeToggle />
                </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
