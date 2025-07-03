
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("shopassist_auth") === "true";
    if (!isAuthenticated) {
      router.push("/admin/login");
    } else {
      setIsVerified(true);
    }
  }, [router]);

  if (!isVerified) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="flex items-center space-x-4 text-2xl font-medium text-primary mb-4">
          <Bot className="w-10 h-10 animate-pulse" />
          <h1 className="font-headline">Verifying Access...</h1>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
