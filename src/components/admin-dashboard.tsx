
"use client";

import { summarizeAndSaveTicket, getSettingsAction } from "@/app/actions";
import type { Message, Settings, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Archive,
  Bot,
  BrainCircuit,
  Contact,
  Loader2,
  LogOut,
  MessageSquare,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Save,
  Send,
  Settings as SettingsIcon,
  ShoppingCart,
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
  SidebarSeparator,
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";

export function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [isSummarizePending, startSummarizeTransition] = useTransition();
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [isSending, startSendingTransition] = useTransition();

  // State for the details panel
  const [customerName, setCustomerName] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [ticketSummary, setTicketSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const selectedTicketId = searchParams.get("ticketId");

  // Fetch settings
  useEffect(() => {
    getSettingsAction().then(setSettings);
  }, []);

  // Fetch all tickets for the sidebar list
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
          notes: data.notes,
          orderNumber: data.orderNumber,
          messages: [],
        });
      });
      setTickets(loadedTickets);
    });

    return () => unsubscribe();
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Load selected ticket and its messages
  useEffect(() => {
    if (selectedTicketId) {
      const ticketData = tickets.find((t) => t.id === selectedTicketId) || null;
      setSelectedTicket(ticketData);
      setAgentInput("");

      if (ticketData) {
        setCustomerName(ticketData.customer.name);
        setCustomerNotes(ticketData.notes || "");
        setTicketSummary(ticketData.summary || "");
      }

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
    const textToSend = agentInput.trim();
    if (!selectedTicket || !textToSend) return;

    setAgentInput('');

    startSendingTransition(async () => {
      await addMessage(selectedTicket.id, { role: 'agent', content: textToSend });
      await updateTicket(selectedTicket.id, { status: "agent" });
    });
  };

  const handleTicketStatusChange = async (
    status: "ai" | "agent" | "closed"
  ) => {
    if (!selectedTicket) return;
    await updateTicket(selectedTicket.id, { status });
  };

  const handleSummaryUpdate = (ticketId: string) => {
    startSummarizeTransition(async () => {
      const newSummary = await summarizeAndSaveTicket(ticketId);
      setTicketSummary(newSummary);
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;
    setIsSaving(true);
    try {
      const updatedData = {
        customer: { ...selectedTicket.customer, name: customerName },
        notes: customerNotes,
        summary: ticketSummary,
        orderNumber: selectedTicket.orderNumber
      };
      await updateTicket(selectedTicket.id, updatedData);
      toast({
        title: "Changes Saved",
        description: "Customer details have been updated.",
      });
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not update customer details.",
      });
    } finally {
      setIsSaving(false);
    }
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
                <Link href={`/admin?ticketId=${ticket.id}`}>
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
                        <span className="font-medium truncate pr-2">
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
          <SidebarSeparator/>
          <SidebarMenuItem>
            <Link href="/admin/settings">
                <SidebarMenuButton tooltip="Settings">
                    <SettingsIcon/>
                    <span>Settings</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
                  <LogOut/>
                  <span>Log Out</span>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-screen">
          <div className="flex-1 flex flex-col">
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
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsDetailsPanelOpen(prev => !prev)}
                    >
                        {isDetailsPanelOpen ? <PanelRightClose/> : <PanelRightOpen/>}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  <ScrollArea className="p-6" ref={scrollAreaRef}>
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
                                    : settings.agentAvatar
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
                            <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
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
                              <AvatarImage
                                src={selectedTicket.customer.avatar}
                              />
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
                <CardFooter className="p-4 border-t flex flex-col items-start gap-2">
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
                      disabled={selectedTicket.status === "closed" || isSending}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={
                        !agentInput.trim() || selectedTicket.status === "closed" || isSending
                      }
                    >
                      {isSending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />}
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

          {selectedTicket && isDetailsPanelOpen && (
            <Card className="w-96 border-l-2 rounded-none flex flex-col transition-all duration-300 ease-in-out">
              <CardHeader className="border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                        <Contact className="w-6 h-6" /> Customer Details
                    </CardTitle>
                </div>
                 <div className="flex items-center gap-2 pt-2 flex-wrap">
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
              <CardContent className="flex-1 space-y-4 overflow-y-auto pt-6">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                {selectedTicket.orderNumber && (
                  <div className="space-y-2">
                    <Label>Order Number</Label>
                    <div className="flex items-center gap-2 text-sm border p-2 rounded-md bg-muted">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground"/>
                        <span>#{selectedTicket.orderNumber}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="customerNotes" className="flex items-center gap-2">
                    <NotebookPen className="w-4 h-4"/> Notes
                  </Label>
                  <Textarea
                    id="customerNotes"
                    placeholder="Add notes about the customer..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketSummary" className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><NotebookPen className="w-4 h-4"/> Summary</span>
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSummaryUpdate(selectedTicket.id)}
                        disabled={isSummarizePending}
                      >
                        <RefreshCw
                          className={cn("mr-2 h-4 w-4", isSummarizePending && "animate-spin")}
                        />
                        Generate
                      </Button>
                  </Label>
                  <Textarea
                    id="ticketSummary"
                    placeholder="A summary of the ticket..."
                    value={ticketSummary}
                    onChange={(e) => setTicketSummary(e.target.value)}
                    rows={6}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
