
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PhoneCall, ClipboardList, BarChart3, Settings, Search, Menu, LogOut, User, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import { NotificationPanel } from "@/components/notification-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Call Logs", href: "/calls", icon: PhoneCall },
  { label: "Complaints", href: "/complaints", icon: ClipboardList },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/calls": "Call Logs",
  "/complaints": "Complaints",
  "/analytics": "Analytics",
  "/settings": "System Configuration",
};

const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  
  if (pathname.startsWith("/complaints/")) return "Complaint Details";
  if (pathname.startsWith("/calls/")) return "Call Details";
  
  return "VMC Portal";
};

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("pb-12 h-screen border-r bg-background flex flex-col sticky top-0", className)}>
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                V
            </span>
            VMC Voice AI
        </h2>
      </div>
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "secondary" : "ghost"}
                className="w-full justify-start font-medium"
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
             <Button 
                variant={pathname === "/settings" ? "secondary" : "ghost"} 
                className="w-full justify-start font-medium"
                asChild
             >
               <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                System Config
               </Link>
             </Button>
          </div>
        </div>
      </div>
      {/* Sidebar Footer with Status */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          System Online
        </div>
        <p className="text-xs text-muted-foreground mt-1">v1.0.0 | API Connected</p>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <div className="hidden md:flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {title}
          </h1>
          {pathname === "/" && (
            <Badge variant="outline" className="text-green-600 border-green-600 animate-pulse">
              Live
            </Badge>
          )}
        </div>
        
        <div className="flex w-full md:w-auto items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          {/* Global Search */}
          <form className="ml-auto flex-1 sm:flex-initial">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search calls, complaints..."
                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
              />
            </div>
          </form>
          
          {/* Theme Toggle */}
          <ModeToggle />
          
          {/* Notification Panel */}
          <NotificationPanel />
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="@vmc_admin" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@vmc.gov.in
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
