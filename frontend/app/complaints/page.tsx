
"use client";

import { useState } from "react";
import { format } from "date-fns";
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
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Filter } from "lucide-react";
import { MOCK_COMPLAINTS } from "@/lib/mock-data";


import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ComplaintsPage() {
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const allFilteredComplaints = MOCK_COMPLAINTS.filter(
    (c) =>
      c.ticketNumber.toLowerCase().includes(filter.toLowerCase()) ||
      c.category.toLowerCase().includes(filter.toLowerCase()) ||
      c.location.toLowerCase().includes(filter.toLowerCase())
  );

  const totalPages = Math.ceil(allFilteredComplaints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const slicedComplaints = allFilteredComplaints.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <Input 
                placeholder="Search complaints..." 
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                className="max-w-sm w-[300px]"
            />
        </div>
        <div className="flex items-center gap-2">
           <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}
            >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Filter
            </span>
          </Button>
          <Button size="sm" className="h-8 gap-1">
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slicedComplaints.map((complaint) => (
              <TableRow key={complaint.id}>
                <TableCell className="font-medium">
                  {complaint.ticketNumber}
                </TableCell>
                <TableCell>{complaint.category}</TableCell>
                <TableCell>
                  <Badge variant={complaint.status === "Resolved" ? "secondary" : "default"}>
                    {complaint.status}
                  </Badge>
                </TableCell>
                <TableCell>
                   <Badge variant={complaint.urgency === "Critical" ? "destructive" : "outline"}>
                    {complaint.urgency}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {complaint.location}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {format(new Date(complaint.timestamp), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                          <a href={`/complaints/${complaint.id}`}>View Details</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit Status</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
            {/* Simplified pagination: just show current page for now since it's mock data */}
            <PaginationItem>
                 <PaginationLink href="#" isActive>{currentPage}</PaginationLink>
            </PaginationItem>
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
  );
}

