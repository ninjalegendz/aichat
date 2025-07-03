
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // This is a mock login. In a real app, you'd validate credentials.
    localStorage.setItem("shopassist_auth", "true");
    router.push("/admin");
    router.refresh(); // Ensure layout re-renders with auth state
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="admin@example.com" defaultValue="admin@example.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" defaultValue="password" required />
      </div>
      <Button type="submit" className="w-full">
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    </form>
  );
}
