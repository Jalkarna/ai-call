
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PhoneCall, ClipboardList, BarChart3, Settings, Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";

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
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

        <h1 className="text-xl font-semibold tracking-tight hidden md:block whitespace-nowrap overflow-hidden text-ellipsis">
            {title}
        </h1>
        
        <div className="flex w-full md:w-auto items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <form className="ml-auto flex-1 sm:flex-initial">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
              />
            </div>
          </form>
          <ModeToggle />
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Avatar>
            <AvatarImage src="/avatars/01.png" alt="@vmc_admin" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
