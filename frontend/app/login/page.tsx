"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mic, Globe, ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Mouse parallax effect
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / 50,
        y: (e.clientY - window.innerHeight / 2) / 50,
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 overflow-hidden">
      
      {/* Left Panel - SaaS Style */}
      <div className="relative hidden h-full flex-col bg-zinc-950 p-10 text-white lg:flex dark:border-r overflow-hidden group">
        
        {/* Dotted Mesh Background */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
        
        {/* Animated Gradient Glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent blur-3xl z-0"
          style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }}
        />

        {/* Header Branding */}
        <div className="relative z-20 flex items-center gap-3">
          <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-lg shadow-blue-500/20">
             {/* Using call-log-vmc.png as the core logo as inferred from context or generic VMC logo */}
            <img src="/vmc-vadodara.png" alt="VMC Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight">VMC Voice AI</span>
        </div>

        {/* Central Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center max-w-lg mt-10">
          
          <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-zinc-500 tracking-tight leading-[1.1] mb-8">
            The Future of <br/>
            Civic Responsive <br/>
            Governance
          </h1>
          
          <div className="relative pl-6 border-l-2 border-blue-500/50 mb-10">
            <p className="text-xl text-zinc-300 font-light italic leading-relaxed">
              "We are transforming Vadodara into a digitally empowered society. This AI platform ensures every citizen's voice is heard, understood, and acted upon instantly."
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm w-fit transition-transform hover:scale-105 duration-300">
            <div className="h-14 w-14 rounded-full border-2 border-blue-500/30 overflow-hidden ring-2 ring-blue-500/20 shadow-lg">
              <img 
                src="https://pbs.twimg.com/profile_images/1821593426430689280/a7SoxTM0_400x400.jpg" 
                alt="Commissioner" 
                className="h-full w-full object-cover" 
              />
            </div>
            <div>
              <div className="font-bold text-white text-base">Shri Arun Mahesh Babu, M.S., IAS</div>
              <div className="text-sm text-blue-400 font-medium">Municipal Commissioner</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">Vadodara Municipal Corporation</div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="relative z-20 mt-auto grid grid-cols-3 gap-4">
          <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-800/80 hover:border-blue-500/30">
            <Mic className="h-5 w-5 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-zinc-200">Voice AI</div>
            <div className="text-xs text-zinc-500 mt-1">Real-time Recognition</div>
          </div>
          <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-800/80 hover:border-purple-500/30">
            <Globe className="h-5 w-5 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-zinc-200">Multi-lingual</div>
            <div className="text-xs text-zinc-500 mt-1">Guj / Hin / Eng</div>
          </div>
          <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-800/80 hover:border-green-500/30">
            <ShieldCheck className="h-5 w-5 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-zinc-200">Secure</div>
            <div className="text-xs text-zinc-500 mt-1">End-to-End Encrypted</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="lg:p-8 w-full h-full flex items-center justify-center bg-background">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px] px-8 sm:px-0">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Enter your credentials to access the admin portal
            </p>
          </div>

          <div className={cn("grid gap-6")}>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="font-medium">Email Address</Label>
                  <Input
                    id="email"
                    placeholder="officer@vmc.gov.in"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="#"
                      className="text-xs text-primary underline-offset-4 hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                
                {error && (
                  <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <Activity className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <Button disabled={isLoading} className="h-11 font-medium text-base shadow-sm">
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Sign In
                </Button>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            By clicking continue, you agree to our{" "}
            <Link
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
