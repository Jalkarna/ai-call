
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_CALLS } from "@/lib/mock-data";
import { useCalls, useBackendStatus } from "@/lib/hooks";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  Download, 
  Phone, 
  PhoneOff, 
  PhoneIncoming,
  MoreHorizontal,
  Eye,
  Play,
  Flag,
  RefreshCw
} from "lucide-react";

const LANGUAGES = ["All", "Hindi", "Gujarati", "English"];
const STATUSES = ["All", "Completed", "Dropped", "Escalated"];
const SENTIMENTS = ["All", "Positive", "Neutral", "Negative", "Frustrated"];

export default function CallsPage() {
  const [searchFilter, setSearchFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use hooks for data fetching with automatic fallback
  const { isAvailable: backendAvailable } = useBackendStatus();
  const { 
    data: callsData, 
    isLoading, 
    isFromBackend, 
    total, 
    refetch 
  } = useCalls({
    page: currentPage,
    pageSize: itemsPerPage,
    language: languageFilter !== "All" ? languageFilter : undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
    sentiment: sentimentFilter !== "All" ? sentimentFilter : undefined,
    search: searchFilter || undefined,
  });

  // Use data from hook or fallback to mock
  const allCalls = callsData || MOCK_CALLS;

  // Client-side filtering when using mock data (hook already filters for backend)
  const filteredCalls = useMemo(() => {
    if (isFromBackend) return allCalls; // Backend already filtered
    
    return allCalls.filter((call) => {
      const matchesSearch = 
        call.callerId.includes(searchFilter) ||
        call.intent.toLowerCase().includes(searchFilter.toLowerCase()) ||
        call.id.toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchesLanguage = languageFilter === "All" || call.language === languageFilter;
      const matchesStatus = statusFilter === "All" || call.status === statusFilter;
      const matchesSentiment = sentimentFilter === "All" || call.sentiment === sentimentFilter;
      
      return matchesSearch && matchesLanguage && matchesStatus && matchesSentiment;
    });
  }, [allCalls, searchFilter, languageFilter, statusFilter, sentimentFilter, isFromBackend]);

  const totalItems = isFromBackend ? total : filteredCalls.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const slicedCalls = isFromBackend ? filteredCalls : filteredCalls.slice(startIndex, startIndex + itemsPerPage);

  const resetFilters = () => {
    setSearchFilter("");
    setLanguageFilter("All");
    setStatusFilter("All");
    setSentimentFilter("All");
    setCurrentPage(1);
  };

  const activeFiltersCount = [languageFilter, statusFilter, sentimentFilter].filter(f => f !== "All").length;

  // Calculate stats from available data
  const stats = useMemo(() => ({
    total: isFromBackend ? total : MOCK_CALLS.length,
    completed: allCalls.filter(c => c.status === "Completed").length,
    dropped: allCalls.filter(c => c.status === "Dropped").length,
    avgDuration: "3:24",
  }), [allCalls, total, isFromBackend]);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.completed}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dropped</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.dropped}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Duration</CardDescription>
            <CardTitle className="text-2xl">{stats.avgDuration}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by caller ID, intent..." 
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
              className="pl-8"
            />
          </div>
          
          <Select value={languageFilter} onValueChange={(v) => { setLanguageFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
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
          
          <Select value={sentimentFilter} onValueChange={(v) => { setSentimentFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              {SENTIMENTS.map((sentiment) => (
                <SelectItem key={sentiment} value={sentiment}>{sentiment}</SelectItem>
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
        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCalls.length)} of {filteredCalls.length} calls
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Time</TableHead>
              <TableHead>Caller ID</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slicedCalls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No calls found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              slicedCalls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-medium">
                    <Link href={`/calls/${call.id}`} className="hover:underline text-primary">
                      {format(new Date(call.timestamp), "HH:mm:ss")}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(call.timestamp), "MMM d")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${
                        call.status === "Dropped" ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"
                      }`}>
                        {call.status === "Dropped" ? (
                          <PhoneOff className="h-3 w-3 text-red-600 dark:text-red-400" />
                        ) : (
                          <Phone className="h-3 w-3 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <span>{call.callerId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{call.duration}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{call.language}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="max-w-[200px] truncate block">{call.intent}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={call.status === "Dropped" ? "destructive" : call.status === "Escalated" ? "secondary" : "default"}>
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      call.sentiment === "Negative" || call.sentiment === "Frustrated" 
                        ? "destructive" 
                        : call.sentiment === "Positive" 
                          ? "default"
                          : "secondary"
                    }>
                      {call.sentiment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/calls/${call.id}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          Play Recording
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="flex items-center gap-2 text-destructive">
                          <Flag className="h-4 w-4" />
                          Flag for Review
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
