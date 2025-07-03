
"use client";

import { useEffect, useState } from "react";
import { CustomerChat } from "@/components/customer-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot } from "lucide-react";
import { getOrCreateTicket } from "@/lib/firestore-service";

// This wrapper handles the logic of finding or creating a ticket ID.
// This prevents hydration errors by ensuring localStorage is only accessed on the client.
const CustomerChatWrapper = () => {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Client-side only
    let id = localStorage.getItem("shopassist_ticket_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("shopassist_ticket_id", id);
    }
    
    const initializeTicket = async (id: string) => {
        try {
            // This will create a ticket in Firestore if it doesn't exist
            await getOrCreateTicket(id);
            setTicketId(id);
        } catch (error) {
            console.error("Failed to initialize ticket:", error);
            // You could show an error message to the user here
        } finally {
            setIsLoading(false);
        }
    }
    
    initializeTicket(id);

  }, []);

  if (isLoading || !ticketId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="flex items-center space-x-4 text-2xl font-medium text-primary mb-4">
          <Bot className="w-10 h-10" />
          <h1 className="font-headline">ShopAssist AI</h1>
        </div>
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-1/2 ml-auto" />
          <Skeleton className="h-16 w-3/4" />
        </div>
      </div>
    );
  }

  return <CustomerChat ticketId={ticketId} />;
};

export default function Home() {
  return <CustomerChatWrapper />;
}
