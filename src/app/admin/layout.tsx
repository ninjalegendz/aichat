
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Bot } from "lucide-react";
import { PushNotificationManager } from "@/components/push-notification-manager";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user && pathname !== "/admin/login") {
        router.push("/admin/login");
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="flex items-center space-x-4 text-2xl font-medium text-primary mb-4">
          <Bot className="w-10 h-10 animate-pulse" />
          <h1 className="font-headline">Verifying Access...</h1>
        </div>
      </div>
    );
  }

  return (
    <>
      {user && <PushNotificationManager />}
      {children}
    </>
  );
}
