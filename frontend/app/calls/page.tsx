
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MOCK_CALLS } from "@/lib/mock-data";


import {
  Pagination,
  PaginationContent,
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

export default function CallsPage() {
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredCalls = MOCK_CALLS.filter(
    (c) =>
      c.callerId.includes(filter) ||
      c.intent.toLowerCase().includes(filter.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const slicedCalls = filteredCalls.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center space-x-2">
            <Input 
                placeholder="Search logs..." 
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                className="max-w-sm w-[300px]"
            />
         </div>
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Caller ID</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sentiment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slicedCalls.map((call) => (
              <TableRow key={call.id}>
                <TableCell className="font-medium">
                   <a href={`/calls/${call.id}`} className="hover:underline text-primary">
                    {format(new Date(call.timestamp), "HH:mm:ss")}
                   </a>
                </TableCell>
                <TableCell>{call.callerId}</TableCell>
                <TableCell>{call.duration}</TableCell>
                <TableCell>{call.language}</TableCell>
                <TableCell>{call.intent}</TableCell>
                 <TableCell>
                  <Badge variant={call.status === "Dropped" ? "destructive" : "secondary"}>
                    {call.status}
                  </Badge>
                </TableCell>
                <TableCell>{call.sentiment}</TableCell>
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
