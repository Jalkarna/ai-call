"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

// Mock users for demo
export const MOCK_USERS = [
  {
    id: "1",
    email: "admin@vmc.gov.in",
    password: "admin123",
    name: "Rajesh Kumar",
    role: "admin" as const,
    department: "IT Administration",
    avatar: "/avatars/admin.png",
  },
  {
    id: "2",
    email: "supervisor@vmc.gov.in",
    password: "super123",
    name: "Priya Sharma",
    role: "supervisor" as const,
    department: "Customer Service",
    avatar: "/avatars/supervisor.png",
  },
  {
    id: "3",
    email: "agent@vmc.gov.in",
    password: "agent123",
    name: "Amit Patel",
    role: "agent" as const,
    department: "Call Center",
    avatar: "/avatars/agent.png",
  },
  {
    id: "4",
    email: "viewer@vmc.gov.in",
    password: "view123",
    name: "Neha Gupta",
    role: "viewer" as const,
    department: "Analytics",
    avatar: "/avatars/viewer.png",
  },
];

export type UserRole = "admin" | "supervisor" | "agent" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

// Role permissions
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["view_dashboard", "manage_calls", "manage_complaints", "view_analytics", "manage_settings", "manage_users"],
  supervisor: ["view_dashboard", "manage_calls", "manage_complaints", "view_analytics", "escalate_calls"],
  agent: ["view_dashboard", "view_calls", "handle_complaints"],
  viewer: ["view_dashboard", "view_analytics"],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("vmc_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("vmc_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const foundUser = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("vmc_user", JSON.stringify(userWithoutPassword));
      return { success: true };
    }

    return { success: false, error: "Invalid email or password" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("vmc_user");
    router.push("/login");
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: string
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, hasPermission } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push("/login");
      }
      if (!isLoading && user && requiredPermission && !hasPermission(requiredPermission)) {
        router.push("/");
      }
    }, [user, isLoading, router]);

    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}
