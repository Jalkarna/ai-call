
"use client";

import { useState, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Target,
  Calendar,
  Download
} from "lucide-react";
import { useAnalytics, useBackendStatus } from "@/lib/hooks";

// Category distribution data
const categoryData = [
  { name: 'Garbage', value: 420, fill: '#3b82f6' },
  { name: 'Streetlight', value: 310, fill: '#22c55e' },
  { name: 'Water', value: 280, fill: '#f59e0b' },
  { name: 'Drainage', value: 195, fill: '#ef4444' },
  { name: 'Road', value: 145, fill: '#8b5cf6' },
  { name: 'Other', value: 95, fill: '#6b7280' },
];

// Language distribution
const languageData = [
  { name: 'Gujarati', value: 58, fill: '#3b82f6' },
  { name: 'Hindi', value: 32, fill: '#22c55e' },
  { name: 'English', value: 10, fill: '#f59e0b' },
];

// Weekly call trend
const weeklyCallData = [
  { day: 'Mon', calls: 245, completed: 232, dropped: 13 },
  { day: 'Tue', calls: 312, completed: 298, dropped: 14 },
  { day: 'Wed', calls: 287, completed: 271, dropped: 16 },
  { day: 'Thu', calls: 356, completed: 338, dropped: 18 },
  { day: 'Fri', calls: 398, completed: 379, dropped: 19 },
  { day: 'Sat', calls: 189, completed: 182, dropped: 7 },
  { day: 'Sun', calls: 145, completed: 141, dropped: 4 },
];

// Hourly distribution
const hourlyData = [
  { hour: '6AM', calls: 25 },
  { hour: '8AM', calls: 78 },
  { hour: '10AM', calls: 145 },
  { hour: '12PM', calls: 198 },
  { hour: '2PM', calls: 167 },
  { hour: '4PM', calls: 189 },
  { hour: '6PM', calls: 134 },
  { hour: '8PM', calls: 67 },
  { hour: '10PM', calls: 34 },
];

// Monthly trend
const monthlyData = [
  { month: 'Jul', complaints: 1245, resolved: 1180 },
  { month: 'Aug', complaints: 1389, resolved: 1298 },
  { month: 'Sep', complaints: 1567, resolved: 1489 },
  { month: 'Oct', complaints: 1423, resolved: 1367 },
  { month: 'Nov', complaints: 1678, resolved: 1598 },
  { month: 'Dec', complaints: 1445, resolved: 1390 },
];

// Resolution time data
const resolutionData = [
  { name: '<24h', value: 35 },
  { name: '24-48h', value: 28 },
  { name: '48-72h', value: 18 },
  { name: '3-7 days', value: 12 },
  { name: '>7 days', value: 7 },
];

// SLA metrics
const slaMetrics = [
  { name: 'Response Time', value: 94, target: 95, unit: '%' },
  { name: 'First Call Resolution', value: 78, target: 80, unit: '%' },
  { name: 'Customer Satisfaction', value: 4.2, target: 4.5, unit: '/5' },
  { name: 'AI Accuracy', value: 92.4, target: 90, unit: '%' },
];

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");

  // Use hooks for data fetching with automatic fallback
  const { isAvailable: backendAvailable } = useBackendStatus();
  const { 
    data: analyticsData, 
    isLoading, 
    isFromBackend, 
    refetch 
  } = useAnalytics({ period: dateRange });

  // Use data from hook or fallback to static mock data
  const kpiStats = useMemo(() => {
    if (analyticsData) {
      return {
        totalCalls: analyticsData.totalCalls,
        avgHandleTime: `${Math.floor(analyticsData.avgHandleTime / 60)}:${(analyticsData.avgHandleTime % 60).toString().padStart(2, '0')}`,
        resolutionRate: analyticsData.resolutionRate,
        totalComplaints: analyticsData.totalComplaints,
      };
    }
    return {
      totalCalls: 8432,
      avgHandleTime: "3:42",
      resolutionRate: 94.8,
      totalComplaints: 1445,
    };
  }, [analyticsData]);

  const chartData = useMemo(() => {
    if (analyticsData) {
      return {
        categoryData: analyticsData.complaintsByCategory.map((item, i) => ({
          ...item,
          fill: COLORS[i % COLORS.length],
        })),
        languageData: analyticsData.callsByLanguage.map((item, i) => ({
          ...item,
          fill: COLORS[i % COLORS.length],
        })),
        weeklyCallData: analyticsData.dailyTrend.map(d => ({
          day: d.date,
          calls: d.calls,
          completed: Math.floor(d.calls * 0.95),
          dropped: Math.floor(d.calls * 0.05),
        })),
        hourlyData: analyticsData.hourlyVolume,
      };
    }
    return {
      categoryData,
      languageData,
      weeklyCallData,
      hourlyData,
    };
  }, [analyticsData]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics Overview</h2>
          <p className="text-sm text-muted-foreground">Comprehensive insights into call center performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-20" /> : kpiStats.totalCalls.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600">+12.5%</span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Handle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : kpiStats.avgHandleTime}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingDown className="h-3 w-3 text-green-500" />
              <span className="text-green-600">-8.3%</span>
              <span className="text-muted-foreground">improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : `${kpiStats.resolutionRate}%`}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600">+2.1%</span>
              <span className="text-muted-foreground">vs target 95%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.4%</div>
            <div className="flex items-center gap-1 text-xs">
              <Badge variant="default" className="text-xs">Above Target</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calls">Call Analytics</TabsTrigger>
          <TabsTrigger value="complaints">Complaint Analytics</TabsTrigger>
          <TabsTrigger value="sla">SLA Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Weekly Call Trend */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Weekly Call Volume</CardTitle>
                <CardDescription>Calls processed over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyCallData}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDropped" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="completed" stroke="#22c55e" fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                      <Area type="monotone" dataKey="dropped" stroke="#ef4444" fillOpacity={1} fill="url(#colorDropped)" name="Dropped" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Language Distribution */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Language Distribution</CardTitle>
                <CardDescription>Caller language preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={languageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {languageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Complaint Categories</CardTitle>
                <CardDescription>Distribution by complaint type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="#888888" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Call Distribution</CardTitle>
                <CardDescription>Peak hours analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hour" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Duration Distribution</CardTitle>
                <CardDescription>Average handle time breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { range: '0-1m', count: 145 },
                      { range: '1-2m', count: 312 },
                      { range: '2-3m', count: 489 },
                      { range: '3-4m', count: 378 },
                      { range: '4-5m', count: 234 },
                      { range: '5m+', count: 156 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="range" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call Outcomes</CardTitle>
                <CardDescription>Resolution breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Resolved', value: 78 },
                          { name: 'Escalated', value: 12 },
                          { name: 'Callback', value: 7 },
                          { name: 'Dropped', value: 3 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="complaints" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Complaint Trend</CardTitle>
                <CardDescription>Complaints registered vs resolved</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="complaints" stroke="#3b82f6" strokeWidth={2} name="Registered" />
                      <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} name="Resolved" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Resolution Time */}
            <Card>
              <CardHeader>
                <CardTitle>Resolution Time Distribution</CardTitle>
                <CardDescription>Time to resolve complaints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resolutionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {slaMetrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="pb-2">
                  <CardDescription>{metric.name}</CardDescription>
                  <CardTitle className="text-3xl">
                    {metric.value}{metric.unit}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">
                    Target: {metric.target}{metric.unit}
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full">
                    <div 
                      className={`h-2 rounded-full ${
                        metric.value >= metric.target ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2">
                    {metric.value >= metric.target ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Meeting Target
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Below Target
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SLA Trend */}
          <Card>
            <CardHeader>
              <CardTitle>SLA Performance Trend</CardTitle>
              <CardDescription>Weekly SLA compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { week: 'W1', responseTime: 92, resolution: 88, satisfaction: 4.0 },
                    { week: 'W2', responseTime: 94, resolution: 90, satisfaction: 4.1 },
                    { week: 'W3', responseTime: 93, resolution: 89, satisfaction: 4.2 },
                    { week: 'W4', responseTime: 95, resolution: 92, satisfaction: 4.3 },
                    { week: 'W5', responseTime: 94, resolution: 91, satisfaction: 4.2 },
                    { week: 'W6', responseTime: 96, resolution: 93, satisfaction: 4.4 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} domain={[80, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="responseTime" stroke="#3b82f6" strokeWidth={2} name="Response Time %" />
                    <Line type="monotone" dataKey="resolution" stroke="#22c55e" strokeWidth={2} name="Resolution %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
