
"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent, //Mera lund lele jalkarna.
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreHorizontal,
  Filter,
  Download,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  MapPin,
  Trash,
  Lightbulb,
  Droplets,
  AlertTriangle,
  Construction
} from "lucide-react";

import { useComplaints, useBackendStatus } from "@/lib/hooks";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const CATEGORIES = ["All", "Garbage Collection", "Streetlight Issue", "Water Supply", "Drainage/Sewage", "Road Repair", "Stray Animal"];
const STATUSES = ["All", "Open", "In Progress", "Resolved", "Closed"];
const URGENCIES = ["All", "Low", "Medium", "High", "Critical"];

const categoryIcons: Record<string, React.ReactNode> = {
  "Garbage Collection": <Trash className="h-4 w-4" />,
  "Streetlight Issue": <Lightbulb className="h-4 w-4" />,
  "Water Supply": <Droplets className="h-4 w-4" />,
  "Drainage/Sewage": <Construction className="h-4 w-4" />,
  "Road Repair": <AlertTriangle className="h-4 w-4" />,
};

export default function ComplaintsPage() {
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("all");

  // Use hooks for data fetching with automatic fallback
  const { isAvailable: backendAvailable } = useBackendStatus();
  const {
    data: complaintsData,
    isLoading,
    isFromBackend,
    total,
    refetch
  } = useComplaints({
    page: currentPage,
    pageSize: itemsPerPage,
    status: statusFilter !== "All" ? statusFilter : undefined,
    urgency: urgencyFilter !== "All" ? urgencyFilter : undefined,
    category: categoryFilter !== "All" ? categoryFilter : undefined,
    search: searchFilter || undefined,
  });

  // Use data from hook
  const allComplaints = complaintsData || [];

  // Client-side filtering (only if needed/fallback)
  const allFilteredComplaints = useMemo(() => {
    let filtered = allComplaints;

    // Tab filters (apply to all data)
    return filtered.filter((complaint) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "open" && complaint.status === "Open") ||
        (activeTab === "in-progress" && complaint.status === "In Progress") ||
        (activeTab === "resolved" && complaint.status === "Resolved") ||
        (activeTab === "urgent" && (complaint.urgency === "High" || complaint.urgency === "Critical"));

      return matchesTab;
    });
  }, [allComplaints, activeTab]);

  const totalItems = total;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  // If backend pagination is used, slicedComplaints is just allFilteredComplaints (current page)
  const slicedComplaints = allFilteredComplaints;

  const resetFilters = () => {
    setSearchFilter("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setUrgencyFilter("All");
    setCurrentPage(1);
  };

  const activeFiltersCount = [categoryFilter, statusFilter, urgencyFilter].filter(f => f !== "All").length;

  // Calculate stats from available data (Note: This is only for the current page if using pagination)
  // Ideally fetch aggregated stats from analytics API
  const stats = useMemo(() => ({
    total: total,
    open: allComplaints.filter(c => c.status === "Open").length,
    inProgress: allComplaints.filter(c => c.status === "In Progress").length,
    resolved: allComplaints.filter(c => c.status === "Resolved").length,
    urgent: allComplaints.filter(c => c.urgency === "High" || c.urgency === "Critical").length,
  }), [allComplaints, total]);

  // Category breakdown
  const categoryStats = useMemo(() =>
    CATEGORIES.filter(c => c !== "All").map(category => ({
      name: category,
      count: allComplaints.filter(c => c.category === category).length,
    })).sort((a, b) => b.count - a.count),
    [allComplaints]);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("all")}>
          <CardHeader className="pb-2">
            <CardDescription>Total Complaints</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("open")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              Open
            </CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.open}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("in-progress")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              In Progress
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.inProgress}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("resolved")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Resolved
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.resolved}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab("urgent")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              Urgent
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.urgent}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs for quick filtering */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="urgent" className="text-destructive">Urgent</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ticket, location, description..."
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
              className="pl-8"
            />
          </div>

          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={urgencyFilter} onValueChange={(v) => { setUrgencyFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              {URGENCIES.map((urgency) => (
                <SelectItem key={urgency} value={urgency}>{urgency}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Reset ({activeFiltersCount})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, allFilteredComplaints.length)} of {allFilteredComplaints.length} complaints
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slicedComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No complaints found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              slicedComplaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-medium">
                    <Link href={`/complaints/${complaint.id}`} className="hover:underline text-primary">
                      {complaint.ticketNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {categoryIcons[complaint.category] || <AlertCircle className="h-4 w-4" />}
                      </span>
                      <span className="max-w-[150px] truncate">{complaint.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      complaint.status === "Resolved" ? "default" :
                        complaint.status === "In Progress" ? "secondary" :
                          complaint.status === "Closed" ? "outline" : "secondary"
                    }>
                      {complaint.status === "Open" && <AlertCircle className="h-3 w-3 mr-1" />}
                      {complaint.status === "In Progress" && <Clock className="h-3 w-3 mr-1" />}
                      {complaint.status === "Resolved" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {complaint.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      complaint.urgency === "Critical" ? "destructive" :
                        complaint.urgency === "High" ? "destructive" :
                          complaint.urgency === "Medium" ? "secondary" : "outline"
                    }>
                      {complaint.urgency}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1 max-w-[200px]">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-sm">{complaint.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {(complaint as any).assigned_to_name || complaint.assignedTo || "Unassigned"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{format(new Date(complaint.createdAt), "MMM d, yyyy")}</span>
                    <p className="text-xs text-muted-foreground">{format(new Date(complaint.createdAt), "h:mm a")}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/complaints/${complaint.id}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Edit Status
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="flex items-center gap-2 text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

