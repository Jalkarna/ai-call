
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Phone,
  ClipboardList,
  AlertTriangle,
  ArrowUpRight,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Headphones
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { useDashboardStats, useCalls, useComplaints, useBackendStatus } from "@/lib/hooks";
import { useActiveCalls } from "@/lib/websocket";
import { format } from "date-fns";

// Mock hourly call data - Keep for chart visual for now, or fetch from analytics if available
const hourlyData = [
  { time: '00:00', calls: 12, completed: 10, dropped: 2 },
  { time: '02:00', calls: 8, completed: 7, dropped: 1 },
  { time: '04:00', calls: 5, completed: 5, dropped: 0 },
  { time: '06:00', calls: 15, completed: 13, dropped: 2 },
  { time: '08:00', calls: 45, completed: 42, dropped: 3 },
  { time: '10:00', calls: 68, completed: 63, dropped: 5 },
  { time: '12:00', calls: 85, completed: 79, dropped: 6 },
  { time: '14:00', calls: 72, completed: 68, dropped: 4 },
  { time: '16:00', calls: 70, completed: 65, dropped: 5 },
  { time: '18:00', calls: 55, completed: 52, dropped: 3 },
  { time: '20:00', calls: 35, completed: 33, dropped: 2 },
  { time: '22:00', calls: 20, completed: 19, dropped: 1 },
];

// Stats type
interface DashboardStats {
  totalCalls: number;
  completedCalls: number;
  droppedCalls: number;
  complaintsRegistered: number;
  avgHandleTime: string;
  aiAccuracy: number;
  activeCalls: number;
  queuedCalls: number;
}

export default function Dashboard() {
  // Use hooks for data fetching
  const { isAvailable: backendAvailable, isChecking: checkingBackend } = useBackendStatus();
  const dashboardStats = useDashboardStats();
  const { data: recentCallsData } = useCalls({ pageSize: 5 });
  const { data: complaintsData } = useComplaints({ pageSize: 20 });

  // Real-time active calls
  const liveCalls = useActiveCalls();

  // Derived data
  const recentCalls = recentCallsData || [];
  const allComplaints = complaintsData || [];
  const urgentComplaints = allComplaints.filter(c => c.urgency === "High" || c.urgency === "Critical").slice(0, 5);

  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    completedCalls: 0,
    droppedCalls: 0,
    complaintsRegistered: 0,
    avgHandleTime: "0:00",
    aiAccuracy: 0,
    activeCalls: 0,
    queuedCalls: 0,
  });

  // Update stats from backend when available
  useEffect(() => {
    if (dashboardStats.data) {
      setStats({
        totalCalls: dashboardStats.data.totalCalls,
        completedCalls: dashboardStats.data.completedToday,
        droppedCalls: dashboardStats.data.droppedToday,
        complaintsRegistered: dashboardStats.data.totalComplaints,
        avgHandleTime: dashboardStats.data.avgHandleTime,
        aiAccuracy: 92.4,
        activeCalls: liveCalls.length || dashboardStats.data.activeCalls,
        queuedCalls: 0,
      });
    }
  }, [dashboardStats.data, liveCalls.length]);

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Initialize last updated time on client only to avoid hydration mismatch
  useEffect(() => {
    setLastUpdated(format(new Date(), "HH:mm:ss"));
    const interval = setInterval(() => {
      setLastUpdated(format(new Date(), "HH:mm:ss"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Data Source Indicator */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="font-medium text-green-600">System Online</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-sm">
            <Headphones className="h-4 w-4 text-primary" />
            <span><strong>{stats.activeCalls}</strong> Active Calls</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span><strong>{stats.queuedCalls}</strong> In Queue</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            Last updated: {lastUpdated ?? "--:--:--"}
          </Badge>
          {process.env.NODE_ENV === 'development' && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={async () => {
                try {
                  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  const response = await fetch(`${API_BASE}/api/calls/test/simulate-call`, { method: 'POST' });
                  const data = await response.json();
                  console.log('Simulation started:', data);
                } catch (error) {
                  console.error('Simulation failed:', error);
                }
              }}
            >
              Test Call
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls (24h)</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">+12% from yesterday</p>
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" /> {stats.completedCalls} completed
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" /> {stats.droppedCalls} dropped
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complaints Registered</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complaintsRegistered}</div>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">{stats.aiAccuracy}% AI Accuracy</p>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${stats.aiAccuracy}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Handle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHandleTime}</div>
            <p className="text-xs text-muted-foreground mt-1">Target: 4:00</p>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: "85%" }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentComplaints.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
            <Button size="sm" variant="destructive" className="mt-2 w-full" asChild>
              <Link href="/complaints?urgency=critical">Review Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Call Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Call Volume (24h)</CardTitle>
            <CardDescription>Calls per hour with completion rate</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="calls" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCalls)" name="Total Calls" />
                  <Area type="monotone" dataKey="completed" stroke="#22c55e" fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Live Calls Panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Calls
              </CardTitle>
              <Badge variant="secondary">{liveCalls.length} active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <div className="space-y-4">
                {liveCalls.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No active calls
                  </div>
                ) : (
                  liveCalls.map((call) => (
                    <div key={call.id || call.session_id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className={`p-2 rounded-full ${call.status === "active" ? "bg-green-100 dark:bg-green-900" : "bg-yellow-100 dark:bg-yellow-900"
                        }`}>
                        {call.status === "active" ? (
                          <PhoneCall className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <PhoneIncoming className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{call.callerId || call.caller_number}</span>
                          <span className="text-sm font-mono text-muted-foreground">{call.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{call.intent}</Badge>
                          <span className="text-xs text-muted-foreground">{call.language}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant={
                            call.sentiment === "Frustrated" ? "destructive" :
                              call.sentiment === "Positive" ? "default" : "secondary"
                          } className="text-xs">
                            {call.sentiment}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" asChild>
                            <Link href={`/calls/${call.id || call.session_id}`}>Monitor</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Calls</CardTitle>
                <CardDescription>Latest processed calls</CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/calls">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div className="flex items-center gap-4" key={call.id}>
                  <div className={`p-2 rounded-full ${call.status === "Dropped" ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"
                    }`}>
                    {call.status === "Dropped" ? (
                      <PhoneOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{call.intent}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.callerId} • {call.language} • {call.duration}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={call.status === "Dropped" ? "destructive" : "secondary"} className="text-xs">
                      {call.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(call.timestamp), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Complaints Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Urgent Complaints</CardTitle>
                <CardDescription>High/Critical priority requiring action</CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/complaints">
                  View All
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">
                      <Link href={`/complaints/${complaint.id}`} className="hover:underline text-primary">
                        {complaint.ticketNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{complaint.category}</TableCell>
                    <TableCell>
                      <Badge variant={complaint.urgency === "Critical" ? "destructive" : "secondary"}>
                        {complaint.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/complaints/${complaint.id}`}>Review</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
