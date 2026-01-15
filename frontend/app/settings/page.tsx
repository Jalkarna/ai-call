
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModeToggle } from "@/components/mode-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Trash2,
  User,
  Users,
  Zap
} from "lucide-react";

// Mock users data
const MOCK_USERS = [
  { id: "1", name: "Admin User", email: "admin@vmc.gov.in", role: "Super Admin", status: "Active", lastLogin: "2024-01-15 10:30" },
  { id: "2", name: "Operator 1", email: "operator1@vmc.gov.in", role: "Operator", status: "Active", lastLogin: "2024-01-15 09:45" },
  { id: "3", name: "Supervisor", email: "supervisor@vmc.gov.in", role: "Supervisor", status: "Active", lastLogin: "2024-01-14 18:20" },
  { id: "4", name: "Operator 2", email: "operator2@vmc.gov.in", role: "Operator", status: "Inactive", lastLogin: "2024-01-10 11:00" },
];

// Mock API keys
const MOCK_API_KEYS = [
  { id: "1", name: "Production Key", key: "vmc_prod_xxxx...xxxx", created: "2024-01-01", lastUsed: "2024-01-15", status: "Active" },
  { id: "2", name: "Development Key", key: "vmc_dev_xxxx...xxxx", created: "2024-01-05", lastUsed: "2024-01-14", status: "Active" },
];

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState([75]);
  const [escalationTimeout, setEscalationTimeout] = useState([30]);

  return (
    <div className="w-full">
      <Tabs defaultValue="general" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Zap className="h-4 w-4" />
            AI Config
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Manage core system parameters and default settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="language">Default Output Language</Label>
                  <Select defaultValue="hi">
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="gu">Gujarati</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Language used for AI responses when caller preference is unknown.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="ist">
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ist">IST (Asia/Kolkata)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input id="org-name" defaultValue="Vadodara Municipal Corporation" />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="helpline">Helpline Number</Label>
                  <Input id="helpline" defaultValue="1800-XXX-XXXX" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="greeting">Custom Greeting Message</Label>
                <Textarea 
                  id="greeting" 
                  defaultValue="नमस्ते। वडोदरा नगर निगम में आपका स्वागत है। मैं आपकी कैसे सहायता कर सकती हूं?"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Initial greeting played when a call is connected.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Theme Mode</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Toggle between Light and Dark themes.
                  </span>
                </Label>
                <ModeToggle />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Compact Mode</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Reduce padding and spacing for denser information display.
                  </span>
                </Label>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Settings</CardTitle>
              <CardDescription>
                Configure AI behavior, thresholds, and extraction parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>LLM Model</Label>
                  <Select defaultValue="gemini-2.0-flash">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label>STT Engine</Label>
                  <Select defaultValue="whisper">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whisper">OpenAI Whisper</SelectItem>
                      <SelectItem value="google">Google Speech-to-Text</SelectItem>
                      <SelectItem value="azure">Azure Speech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Confidence Threshold</Label>
                    <span className="text-sm font-medium">{confidenceThreshold[0]}%</span>
                  </div>
                  <Slider
                    value={confidenceThreshold}
                    onValueChange={setConfidenceThreshold}
                    max={100}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fields with confidence below this threshold will be flagged for review.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Auto-Escalation Timeout</Label>
                    <span className="text-sm font-medium">{escalationTimeout[0]} seconds</span>
                  </div>
                  <Slider
                    value={escalationTimeout}
                    onValueChange={setEscalationTimeout}
                    max={120}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before automatically escalating to human operator if AI cannot resolve.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label className="flex flex-col gap-1">
                    <span>Auto-file Low-risk Complaints</span>
                    <span className="font-normal text-muted-foreground text-sm">
                      Automatically submit complaints with high confidence scores.
                    </span>
                  </Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex flex-col gap-1">
                    <span>Sentiment-based Escalation</span>
                    <span className="font-normal text-muted-foreground text-sm">
                      Escalate calls when negative sentiment is detected.
                    </span>
                  </Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex flex-col gap-1">
                    <span>Real-time Transcript Streaming</span>
                    <span className="font-normal text-muted-foreground text-sm">
                      Stream transcripts to dashboard in real-time.
                    </span>
                  </Label>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Save AI Configuration
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complaint Categories</CardTitle>
              <CardDescription>
                Manage complaint types that the AI can classify.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["Garbage Collection", "Streetlight Issue", "Water Supply", "Drainage/Sewage", "Road Repair", "Stray Animal", "Illegal Encroachment", "Noise Complaint", "Other"].map((category) => (
                  <Badge key={category} variant="secondary" className="gap-1">
                    {category}
                    <button className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive alerts and system updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Critical Alerts</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Receive immediate notifications for critical complaints.
                  </span>
                </Label>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Escalation Alerts</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Notify when calls are escalated to human operators.
                  </span>
                </Label>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Low Confidence Alerts</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Alert when AI extraction confidence is below threshold.
                  </span>
                </Label>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Daily Digest</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Receive a daily summary of call center activity.
                  </span>
                </Label>
                <Switch />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Weekly Reports</span>
                  <span className="font-normal text-muted-foreground text-sm">
                    Automated weekly performance reports via email.
                  </span>
                </Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Recipients</CardTitle>
              <CardDescription>
                Email addresses that receive system notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Enter email address" className="flex-1" />
                <Button>Add</Button>
              </div>
              <div className="space-y-2">
                {["admin@vmc.gov.in", "supervisor@vmc.gov.in"].map((email) => (
                  <div key={email} className="flex items-center justify-between p-2 rounded-md border">
                    <span className="text-sm">{email}</span>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions.
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account with specific role permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Full Name</Label>
                      <Input placeholder="Enter full name" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="user@vmc.gov.in" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_USERS.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "Super Admin" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "Active" ? "default" : "secondary"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLogin}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Configure access levels for each role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { role: "Super Admin", permissions: ["Full system access", "User management", "API keys", "All settings"] },
                  { role: "Admin", permissions: ["View all data", "Manage complaints", "View analytics", "Settings (limited)"] },
                  { role: "Supervisor", permissions: ["View calls", "Manage complaints", "Takeover calls", "View analytics"] },
                  { role: "Operator", permissions: ["View assigned calls", "Update complaints", "Basic dashboard"] },
                ].map((item) => (
                  <div key={item.role} className="flex items-start gap-4 p-3 rounded-md border">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{item.role}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage API keys for external integrations.
                </CardDescription>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Generate New Key
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_API_KEYS.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {showApiKey === apiKey.id ? "vmc_prod_a1b2c3d4e5f6g7h8" : apiKey.key}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                          >
                            {showApiKey === apiKey.id ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{apiKey.created}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{apiKey.lastUsed}</TableCell>
                      <TableCell>
                        <Badge variant="default">{apiKey.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Regenerate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Security Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                API keys provide full access to your Vadodara Municipal Corporation Complaint Center system. Keep them secure and never share them publicly. 
                If you suspect a key has been compromised, regenerate it immediately. All API access is logged for security auditing.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
