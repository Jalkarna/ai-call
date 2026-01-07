
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Phone, ClipboardList, AlertTriangle, ArrowUpRight } from "lucide-react";
import {  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_CALLS, MOCK_COMPLAINTS } from "@/lib/mock-data";

const data = [
  { name: '00:00', calls: 12 },
  { name: '04:00', calls: 8 },
  { name: '08:00', calls: 45 },
  { name: '12:00', calls: 85 },
  { name: '16:00', calls: 70 },
  { name: '20:00', calls: 35 },
  { name: '23:59', calls: 20 },
];

export default function Dashboard() {
  const recentCalls = MOCK_CALLS.slice(0, 5);
  const urgentComplaints = MOCK_COMPLAINTS.filter(c => c.urgency === "High" || c.urgency === "Critical").slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls (24h)</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complaints Registered</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">384</div>
            <p className="text-xs text-muted-foreground">92% AI Accuracy</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentComplaints.length}</div>
            <p className="text-xs text-muted-foreground">Requires immediate approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        {/* Call Volume Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Call Volume (Real-time)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="calls" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Calls List */}
         <Card x-chunk="dashboard-01-chunk-5">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
                Live incoming calls and processed intents.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8">
            {recentCalls.map((call) => (
                <div className="flex items-center gap-4" key={call.id}>
                <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                    {call.intent}
                    </p>
                    <p className="text-sm text-muted-foreground">
                    {call.callerId} • {call.language}
                    </p>
                </div>
                <div className="ml-auto font-medium">
                    {call.status === "Dropped" ? (
                        <Badge variant="destructive" className="text-xs">Dropped</Badge>
                    ) : (
                         <span className="text-sm text-green-600">Processed</span>
                    )}
                </div>
                </div>
            ))}
          </CardContent>
        </Card>
      </div>

       {/* Urgent Complaints Table */}
       <Card>
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Urgent Complaints</CardTitle>
                    <CardDescription>
                        Complaints flagged as High or Critical urgency by AI.
                    </CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                    <a href="/complaints">
                        View All
                        <ArrowUpRight className="h-4 w-4" />
                    </a>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ticket</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Urgency</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {urgentComplaints.map((complaint) => (
                            <TableRow key={complaint.id}>
                                <TableCell className="font-medium">{complaint.ticketNumber}</TableCell>
                                <TableCell>{complaint.category}</TableCell>
                                <TableCell>{complaint.location}</TableCell>
                                <TableCell>
                                    <Badge variant={complaint.urgency === "Critical" ? "destructive" : "secondary"}>
                                        {complaint.urgency}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                     <Button size="sm" variant="outline">Review</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
       </Card>
    </div>
  );
}
