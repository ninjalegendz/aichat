
"use client";

import { summarizeAndSaveTicket } from "@/app/actions";
import type { Message, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Archive,
  Bot,
  BrainCircuit,
  LogOut,
  MessageSquare,
  RefreshCw,
  Send,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "./ui/sidebar";
import { Textarea } from "./ui/textarea";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  Timestamp,
} from "firebase/firestore";
import { addMessage, updateTicket } from "@/lib/firestore-service";

export function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const selectedTicketId = searchParams.get("ticketId");

  useEffect(() => {
    const ticketsQuery = query(
      collection(db, "tickets"),
      orderBy("lastUpdate", "desc")
    );
    const unsubscribe = onSnapshot(ticketsQuery, (querySnapshot) => {
      const loadedTickets: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedTickets.push({
          id: doc.id,
          status: data.status,
          summary: data.summary,
          customer: data.customer,
          lastUpdate:
            (data.lastUpdate as Timestamp)?.toDate().toISOString() ||
            new Date().toISOString(),
          messages: [], // messages are in a subcollection
        });
      });
      setTickets(loadedTickets);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedTicketId) {
      const ticketData = tickets.find((t) => t.id === selectedTicketId) || null;
      setSelectedTicket(ticketData);

      const messagesQuery = query(
        collection(db, `tickets/${selectedTicketId}/messages`),
        orderBy("createdAt", "asc")
      );
      const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
        const newMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          newMessages.push({
            id: doc.id,
            ...data,
            createdAt:
              (data.createdAt as Timestamp)?.toDate().toISOString() ||
              new Date().toISOString(),
          } as Message);
        });
        setMessages(newMessages);
      });
      return () => unsubscribe();
    } else {
      setSelectedTicket(null);
      setMessages([]);
    }
  }, [selectedTicketId, tickets]);

  const handleAgentSendMessage = async () => {
    if (!agentInput.trim() || !selectedTicket) return;

    const agentMessage: Omit<Message, "id" | "createdAt"> = {
      role: "agent",
      content: agentInput,
    };

    await addMessage(selectedTicket.id, agentMessage);
    await updateTicket(selectedTicket.id, { status: "agent" });
    setAgentInput("");
  };

  const handleTicketStatusChange = async (
    status: "ai" | "agent" | "closed"
  ) => {
    if (!selectedTicket) return;
    await updateTicket(selectedTicket.id, { status });
  };

  const handleSummaryUpdate = (ticketId: string) => {
    startTransition(async () => {
      await summarizeAndSaveTicket(ticketId);
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
            <BrainCircuit className="w-7 h-7 text-primary" />
            <span className="text-xl font-headline font-semibold group-data-[collapsible=icon]:hidden">
              ShopAssist
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {tickets.map((ticket) => (
              <SidebarMenuItem key={ticket.id}>
                <Link href={`/admin?ticketId=${ticket.id}`} legacyBehavior>
                  <SidebarMenuButton
                    isActive={selectedTicketId === ticket.id}
                    className="h-auto flex-col items-start p-2"
                    tooltip={ticket.customer.name}
                  >
                    <div className="flex justify-between w-full items-center">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={ticket.customer.avatar} />
                          <AvatarFallback>
                            {ticket.customer.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {ticket.customer.name}
                        </span>
                      </div>
                      <Badge
                        variant={
                          ticket.status === "closed"
                            ? "outline"
                            : ticket.status === "agent"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground w-full truncate mt-1">
                      {ticket.summary || "..."}
                    </p>
                    <div className="text-xs text-muted-foreground/80 w-full mt-1">
                      {formatDistanceToNow(new Date(ticket.lastUpdate), {
                        addSuffix: true,
                      })}
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
            {tickets.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No active tickets.
              </div>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">
              Log Out
            </span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
          {selectedTicket ? (
            <Card className="flex-1 flex flex-col h-full border-0 rounded-none">
              <CardHeader className="flex-row items-center justify-between border-b">
                <div>
                  <CardTitle>{selectedTicket.customer.name}</CardTitle>
                  <CardDescription>
                    ID: {selectedTicket.id.substring(0, 8)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSummaryUpdate(selectedTicket.id)}
                    disabled={isPending}
                  >
                    <RefreshCw
                      className={cn("mr-2 h-4 w-4", isPending && "animate-spin")}
                    />{" "}
                    Summary
                  </Button>
                  {selectedTicket.status !== "agent" && (
                    <Button
                      size="sm"
                      onClick={() => handleTicketStatusChange("agent")}
                    >
                      <UserCheck className="mr-2 h-4 w-4" /> Take Over
                    </Button>
                  )}
                  {selectedTicket.status === "agent" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleTicketStatusChange("ai")}
                    >
                      <Bot className="mr-2 h-4 w-4" /> Let AI Handle
                    </Button>
                  )}
                  {selectedTicket.status !== "closed" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleTicketStatusChange("closed")}
                    >
                      <Archive className="mr-2 h-4 w-4" /> Close Ticket
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                  <div className="space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-start gap-3",
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        )}
                      >
                        {message.role !== "user" && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={
                                message.role === "assistant"
                                  ? `https://placehold.co/40x40/26A69A/FFFFFF/png?text=A`
                                  : `https://placehold.co/40x40/1E88E5/FFFFFF/png?text=S`
                              }
                            />
                            <AvatarFallback>
                              {message.role === "assistant" ? "A" : "S"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl",
                            message.role === "user"
                              ? "bg-muted rounded-br-none"
                              : message.role === "agent"
                              ? "bg-primary text-primary-foreground rounded-bl-none"
                              : "bg-card border rounded-bl-none"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              message.role === "agent"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground/70"
                            )}
                          >
                            {format(new Date(message.createdAt), "p")}
                          </p>
                        </div>
                        {message.role === "user" && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={selectedTicket.customer.avatar} />
                            <AvatarFallback>
                              {selectedTicket.customer.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAgentSendMessage();
                  }}
                  className="flex items-center gap-2 w-full"
                >
                  <Textarea
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    placeholder="Type your response as an agent..."
                    className="flex-1 resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAgentSendMessage();
                      }
                    }}
                    disabled={selectedTicket.status === "closed"}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={
                      !agentInput.trim() || selectedTicket.status === "closed"
                    }
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mb-4" />
              <h2 className="text-xl font-semibold">Select a ticket</h2>
              <p>Choose a conversation from the left to view details.</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
