
"use client";

import { summarizeAndSaveTicket, getSettingsAction } from "@/app/actions";
import type { Message, Settings, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { linkify } from "@/lib/linkify";
import {
  Archive,
  Bell,
  BellOff,
  Bot,
  BrainCircuit,
  Contact,
  Download,
  Loader2,
  LogOut,
  MessageSquare,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Reply,
  Save,
  Send,
  Settings as SettingsIcon,
  ShoppingCart,
  UserCheck,
  X,
  MessageSquareReply,
  Paperclip,
  Trash2,
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
  SidebarTrigger,
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
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { saveFile } from "@/lib/indexed-db";
import { AttachmentPreview } from "./attachment-preview";
import { FilePreviewInput } from "./file-preview-input";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];


export function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [isSummarizePending, startSummarizeTransition] = useTransition();
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [isSending, startSendingTransition] = useTransition();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Quick reply state
  const [quickReplyQuery, setQuickReplyQuery] = useState("");
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);

  // State for the details panel
  const [customerName, setCustomerName] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [ticketSummary, setTicketSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevTicketsRef = useRef<Ticket[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const selectedTicketId = searchParams.get("ticketId");
  const hasScrolledRef = useRef(false);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
       setTimeout(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      }, 50);
    }
  };

  useEffect(() => {
    const savedPref = localStorage.getItem("shopassist_notifications_enabled");
    if (savedPref !== null) {
      setNotificationsEnabled(JSON.parse(savedPref));
    }
  }, []);

  const handleToggleNotifications = () => {
    const newPref = !notificationsEnabled;
    setNotificationsEnabled(newPref);
    localStorage.setItem("shopassist_notifications_enabled", JSON.stringify(newPref));
    toast({
        title: `Notifications ${newPref ? 'Enabled' : 'Disabled'}`,
    });
  };

  useEffect(() => {
    getSettingsAction().then(setSettings);
  }, []);

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

  useEffect(() => {
    if (!notificationsEnabled) return;

    const newlyNeedingAttention = tickets.filter(ticket => {
      if (ticket.status !== 'needs-attention') return false;
      const prevTicket = prevTicketsRef.current.find(pt => pt.id === ticket.id);
      return !prevTicket || prevTicket.status !== 'needs-attention';
    });

    if (newlyNeedingAttention.length > 0) {
      audioRef.current?.play().catch(() => {});
      newlyNeedingAttention.forEach(ticket => {
        toast({
          title: "Agent Required",
          description: `Ticket from ${ticket.customer.name} needs attention.`,
        });
      });
    }
    prevTicketsRef.current = tickets;
  }, [tickets, notificationsEnabled, toast]);

  useEffect(() => {
     if (messages.length > 0 && hasScrolledRef.current) {
        const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
          if (isAtBottom) {
            scrollToBottom();
          }
        }
    }
  }, [messages]);

  useEffect(() => {
    if (selectedTicketId) {
      const ticketData = tickets.find((t) => t.id === selectedTicketId) || null;
      
      if (ticketData?.status === 'needs-attention') {
        updateTicket(ticketData.id, { status: 'agent' });
      }

      setSelectedTicket(ticketData);
      setAgentInput("");
      setReplyingTo(null);
      setSelectedFile(null);


      if (ticketData) {
        setCustomerName(ticketData.customer.name);
        setCustomerNotes(ticketData.notes || "");
        setTicketSummary(ticketData.summary || "");
      }
      
      hasScrolledRef.current = false; // Reset scroll flag for new ticket

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

        if (!hasScrolledRef.current) {
          scrollToBottom("auto");
          hasScrolledRef.current = true;
        }
      });
      return () => unsubscribe();
    } else {
      setSelectedTicket(null);
      setMessages([]);
    }
  }, [selectedTicketId, tickets]);

  const handleAgentSendMessage = async () => {
    const textToSend = agentInput.trim();
    if (!selectedTicket || (!textToSend && !selectedFile)) return;

    startSendingTransition(async () => {
      let attachment;
      if (selectedFile) {
        try {
          const fileId = await saveFile(selectedFile);
          attachment = {
            fileId,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
          };
          setSelectedFile(null);
        } catch (error) {
          console.error("Failed to save file:", error);
          toast({
            variant: "destructive",
            title: "File Upload Failed",
            description: "Could not save the attachment.",
          });
          return;
        }
      }

      const replyInfo = replyingTo
        ? {
            messageId: replyingTo.id,
            content: replyingTo.content,
            role: replyingTo.role,
          }
        : undefined;
      setReplyingTo(null);
      setAgentInput('');

      await addMessage(selectedTicket.id, {
        role: "agent",
        content: textToSend,
        replyTo: replyInfo,
        attachment,
      });
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
  
  const reassignAgentTicketsToAI = async () => {
    const agentTickets = tickets.filter((t) => t.status === 'agent');
    if (agentTickets.length > 0) {
        const updatePromises = agentTickets.map((ticket) =>
            updateTicket(ticket.id, { status: 'ai' })
        );
        await Promise.all(updatePromises);
    }
  };

  const handleLogout = async () => {
    await reassignAgentTicketsToAI();
    await signOut(auth);
    router.push("/admin/login");
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      reassignAgentTicketsToAI();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  const handleAgentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAgentInput(value);
    if (value.startsWith('/')) {
      setIsQuickReplyOpen(true);
      setQuickReplyQuery(value.substring(1));
    } else {
      setIsQuickReplyOpen(false);
    }
  };

  const handleSelectQuickReply = (text: string) => {
    setAgentInput(text);
    setIsQuickReplyOpen(false);
  };

  const handleDownloadTranscript = (downloadFormat: 'txt' | 'json') => {
    if (!selectedTicket || messages.length === 0) return;

    let content = '';
    let mimeType = '';
    let fileExtension = '';

    const fileName = `transcript-${selectedTicket.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}`;

    if (downloadFormat === 'txt') {
        content = messages.map(msg => {
            const timestamp = format(new Date(msg.createdAt), 'yyyy-MM-dd HH:mm:ss');
            const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
            let replyText = '';
            if (msg.replyTo) {
                replyText = ` (replying to ${msg.replyTo.role}: "${msg.replyTo.content.substring(0, 30)}...")`;
            }
            let attachmentText = '';
            if (msg.attachment) {
                attachmentText = ` [Attachment: ${msg.attachment.fileName}]`;
            }
            return `[${timestamp}] ${role}${replyText}:\n${msg.content}${attachmentText}\n`;
        }).join('\n----------------------------------------\n');
        mimeType = 'text/plain';
        fileExtension = 'txt';
    } else if (downloadFormat === 'json') {
        content = JSON.stringify(messages.map(({attachment, ...rest}) => ({...rest, attachment: attachment ? {fileName: attachment.fileName, fileType: attachment.fileType} : undefined})), null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
        title: "Transcript Downloaded",
        description: `The chat transcript has been saved as a .${fileExtension} file.`,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `The maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        });
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select an image (JPG, PNG, GIF) or PDF file.',
        });
        return;
      }
      setSelectedFile(file);
    }
    // Reset file input value to allow selecting the same file again
    if(e.target) e.target.value = '';
  };

  const filteredQuickReplies = settings.quickReplies?.filter(reply => 
    reply.text.toLowerCase().includes(quickReplyQuery.toLowerCase())
  ) || [];

  const ReplyPreview = ({ message, onCancel }: { message: Message, onCancel: () => void }) => (
    <div className="p-2 border-t text-sm bg-muted/50">
      <div className="flex justify-between items-center mb-1">
        <p className="font-semibold text-muted-foreground">Replying to {message.role}</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="bg-background/50 p-2 rounded-md border text-muted-foreground truncate">
        {message.content}
      </p>
    </div>
  );

  const RepliedMessage = ({ message, settings }: { message: NonNullable<Message['replyTo']>, settings: Partial<Settings> }) => {
    const getRoleName = () => {
      switch (message.role) {
        case 'user': return 'Customer';
        case 'agent': return settings.agentName || 'Agent';
        case 'assistant': return 'AI Assistant';
        default: return 'User';
      }
    }
    return (
        <div className="p-2 rounded-md mb-2 text-sm bg-black/5 border-l-2 border-primary/50">
            <p className="font-semibold text-xs text-muted-foreground">
                {getRoleName()}
            </p>
            <p className="truncate text-muted-foreground">{message.content}</p>
        </div>
    )
  }

  const DetailsPanel = () => (
    <Card className="w-full h-full border-0 rounded-none flex flex-col">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
                <Contact className="w-6 h-6" /> Customer Details
            </CardTitle>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownloadTranscript('txt')}>
                        As TXT
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadTranscript('json')}>
                        As JSON
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
         <div className="flex items-center gap-2 pt-2 flex-wrap">
            {selectedTicket?.status !== "agent" && (
            <Button
                size="sm"
                onClick={() => handleTicketStatusChange("agent")}
            >
                <UserCheck className="mr-2 h-4 w-4" /> Take Over
            </Button>
            )}
            {selectedTicket?.status === "agent" && (
            <Button
                size="sm"
                variant="secondary"
                onClick={() => handleTicketStatusChange("ai")}
            >
                <Bot className="mr-2 h-4 w-4" /> Let AI Handle
            </Button>
            )}
            {selectedTicket?.status !== "closed" && (
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
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Order Number</Label>
          <div className="flex items-center gap-2 text-sm border p-2 rounded-md bg-muted">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <span>
              {selectedTicket?.orderNumber
                ? `#${selectedTicket.orderNumber}`
                : "Not provided"}
            </span>
          </div>
        </div>
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
                onClick={() => handleSummaryUpdate(selectedTicket!.id)}
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
  );

  return (
    <SidebarProvider>
       <audio ref={audioRef} src="https://files.catbox.moe/em648t.mp3" preload="auto" />
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
            {settings.brandLogoUrl ? (
              <Image
                src={settings.brandLogoUrl}
                alt="Brand Logo"
                width={120}
                height={28}
                className="h-7 w-auto object-contain group-data-[collapsible=icon]:hidden"
              />
            ) : (
              <>
                <BrainCircuit className="w-7 h-7 text-primary" />
                <span className="text-xl font-headline font-semibold group-data-[collapsible=icon]:hidden">
                  ShopAssist
                </span>
              </>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {tickets.map((ticket) => (
              <SidebarMenuItem key={ticket.id} className="border-b border-sidebar-border last:border-b-0">
                <Link href={`/admin?ticketId=${ticket.id}`}>
                  <SidebarMenuButton
                    isActive={selectedTicketId === ticket.id}
                    className={cn(
                        "h-auto flex-col items-start p-2",
                        ticket.status === 'needs-attention' && 'animate-attention'
                    )}
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
                            : ticket.status === "needs-attention"
                            ? "destructive"
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
           <SidebarMenu>
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
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-screen flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:hidden">
            <SidebarTrigger />
            <div className="flex-1 truncate">
              {selectedTicket ? (
                <h1 className="font-semibold">{selectedTicket.customer.name}</h1>
              ) : (
                <h1 className="font-semibold">Dashboard</h1>
              )}
            </div>
            {selectedTicket && (
              <Button variant="ghost" size="icon" onClick={() => setIsDetailsPanelOpen(true)}>
                <Contact className="h-5 w-5" />
                <span className="sr-only">Customer Details</span>
              </Button>
            )}
          </header>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col">
              {selectedTicket ? (
                <Card className="flex-1 flex flex-col h-full border-0 rounded-none">
                  <CardHeader className="hidden md:flex flex-row items-center justify-between border-b">
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
                          onClick={handleToggleNotifications}
                          title={notificationsEnabled ? 'Mute Notifications' : 'Unmute Notifications'}
                      >
                          {notificationsEnabled ? <Bell/> : <BellOff className="text-muted-foreground"/>}
                      </Button>
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
                    <ScrollArea className="flex-1" ref={scrollAreaRef}>
                      <div className="space-y-2 p-4 md:p-6">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "flex items-start gap-3 group",
                              message.role === "user"
                                ? "flex-row-reverse"
                                : ""
                            )}
                          >
                            <Avatar className="w-8 h-8">
                                <AvatarImage
                                    src={
                                    message.role === "user"
                                        ? selectedTicket.customer.avatar
                                        : message.role === "assistant"
                                        ? undefined
                                        : settings.agentAvatar
                                    }
                                />
                                <AvatarFallback>
                                    {message.role === "user"
                                    ? selectedTicket.customer.name.charAt(0)
                                    : message.role === "assistant" ? "A" : settings.agentName?.charAt(0) || 'S'}
                                </AvatarFallback>
                            </Avatar>
                           
                            <div
                              className={cn(
                                "flex items-center gap-2",
                                message.role === "user" && "flex-row-reverse"
                              )}
                            >
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setReplyingTo(message)}>
                                    <MessageSquareReply className="w-4 h-4"/>
                                </Button>
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
                                {message.replyTo && <RepliedMessage message={message.replyTo} settings={settings} />}
                                {message.attachment && (
                                  <div className={cn(message.content && 'mb-2')}>
                                    <AttachmentPreview
                                      fileId={message.attachment.fileId}
                                      fileName={message.attachment.fileName}
                                      fileType={message.attachment.fileType}
                                      context="message"
                                    />
                                  </div>
                                )}
                                {message.content && <div className="text-sm prose" style={{ whiteSpace: 'pre-wrap' }}>{linkify(message.content)}</div>}
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {replyingTo && <ReplyPreview message={replyingTo} onCancel={() => setReplyingTo(null)} />}
                    <div className="p-4 border-t bg-background/80 relative">
                        {selectedFile && <FilePreviewInput file={selectedFile} onRemove={() => setSelectedFile(null)} />}
                        <Popover open={isQuickReplyOpen} onOpenChange={setIsQuickReplyOpen}>
                            <PopoverTrigger asChild>
                                <div />
                            </PopoverTrigger>
                            <PopoverContent className="w-[calc(100%-2rem)] p-1 mb-2 max-h-60 overflow-y-auto">
                                {filteredQuickReplies.length > 0 ? (
                                    filteredQuickReplies.map(reply => (
                                        <div 
                                            key={reply.id} 
                                            className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm"
                                            onClick={() => handleSelectQuickReply(reply.text)}
                                        >
                                            {reply.text}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-muted-foreground">No matching quick replies.</div>
                                )}
                            </PopoverContent>
                        </Popover>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAgentSendMessage();
                        }}
                        className="flex items-center gap-2 w-full"
                      >
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept={ALLOWED_FILE_TYPES.join(',')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={selectedTicket.status === "closed" || isSending}
                          >
                            <Paperclip className="w-5 h-5" />
                          </Button>
                        <Textarea
                          value={agentInput}
                          onChange={handleAgentInputChange}
                          placeholder="Type your response as an agent... (use '/' for quick replies)"
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
                            (!agentInput.trim() && !selectedFile) || selectedTicket.status === "closed" || isSending
                          }
                        >
                          {isSending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />}
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                  <MessageSquare className="w-16 h-16 mb-4" />
                  <h2 className="text-xl font-semibold">Select a ticket</h2>
                  <p>Choose a conversation from the left to view details.</p>
                </div>
              )}
            </div>

            {selectedTicket && (isMobile ? (
              <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
                <SheetContent className="p-0 w-[85vw] sm:max-w-sm">
                  <SheetTitle className="sr-only">Customer Details</SheetTitle>
                  <DetailsPanel />
                </SheetContent>
              </Sheet>
            ) : (
              isDetailsPanelOpen && <div className="w-96 border-l-2"><DetailsPanel /></div>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
