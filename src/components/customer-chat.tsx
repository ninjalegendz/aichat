
"use client";

import type { Message, Settings, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { linkify } from "@/lib/linkify";
import { ArrowUp, BrainCircuit, Loader2, MessageSquareReply, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { getAiResponse, getSettingsAction } from "@/app/actions";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { addMessage, updateTicket } from "@/lib/firestore-service";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  Timestamp,
} from "firebase/firestore";
import Image from "next/image";
import { saveFile } from "@/lib/indexed-db";
import { useToast } from "@/hooks/use-toast";
import { FilePreviewInput } from "./file-preview-input";
import { AttachmentPreview } from "./attachment-preview";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
  </div>
);

const AgentConnectionStatus = ({ agentName }: { agentName: string }) => (
    <div className="text-center text-xs text-muted-foreground py-2 px-6">
        <p className="bg-muted inline-block px-3 py-1 rounded-full animate-in fade-in">
            {agentName || 'An agent'} has connected to the chat.
        </p>
    </div>
);

export function CustomerChat({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const ticketRef = useRef<Ticket | null>(null); // To track previous state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isSending, startSendingTransition] = useTransition();
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [showAgentConnected, setShowAgentConnected] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    getSettingsAction().then(setSettings);

    const ticketDocRef = doc(db, "tickets", ticketId);
    const unsubscribeTicket = onSnapshot(ticketDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const oldTicket = ticketRef.current;
        const newTicketData = docSnap.data();
        const newTicket = {
          id: docSnap.id,
          ...newTicketData,
          lastUpdate: (newTicketData.lastUpdate as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Ticket;

        if (oldTicket?.status !== 'agent' && newTicket.status === 'agent') {
            setShowAgentConnected(true);
            setTimeout(() => setShowAgentConnected(false), 5000);
        }

        setTicket(newTicket);
        ticketRef.current = newTicket;
      }
    });

    const messagesQuery = query(
      collection(db, `tickets/${ticketId}/messages`),
      orderBy("createdAt", "asc")
    );
    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
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
    
    return () => {
      unsubscribeTicket();
      unsubscribeMessages();
    };
  }, [ticketId]);

  useEffect(() => {
    if (messages.length > 0 && !hasScrolledRef.current) {
        scrollToBottom("auto");
        hasScrolledRef.current = true;
    }
  }, [messages]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 150;
      if (isAtBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);


  const handleSendMessage = async () => {
    const textToSend = input.trim();
    if (!ticket || (!textToSend && !selectedFile)) return;

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

      setInput('');
      const replyInfo = replyingTo ? {
        messageId: replyingTo.id,
        content: replyingTo.content,
        role: replyingTo.role,
      } : undefined;
      setReplyingTo(null);

      await addMessage(ticketId, { role: 'user', content: textToSend, replyTo: replyInfo, attachment });
      
      let wasClosed = false;
      if (ticket.status === 'closed') {
        await updateTicket(ticketId, { status: 'needs-attention' });
        wasClosed = true;
      }
      
      if (ticket.status === 'ai' || wasClosed) {
        setIsAiTyping(true);
        const tempUserMessage = { role: 'user', content: textToSend, id: 'temp-user', createdAt: new Date().toISOString() };
        
        const chatHistoryForAI = [...messages, tempUserMessage]
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");
        
        const aiResponseContent = await getAiResponse(textToSend, chatHistoryForAI, ticketId);
        
        await addMessage(ticketId, { role: "assistant", content: aiResponseContent });
        setIsAiTyping(false);
      }
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
    if(e.target) e.target.value = '';
  };

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
        case 'user': return 'You';
        case 'agent': return settings.agentName || 'Agent';
        case 'assistant': return settings.agentName || 'AI Assistant';
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

  return (
    <div className="min-h-screen bg-background md:flex md:items-center md:justify-center md:p-4">
      <Card className="w-full h-screen md:h-[90vh] md:max-w-2xl flex flex-col md:shadow-2xl md:rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 h-8 text-primary font-headline">
            {settings.brandLogoUrl ? (
                <Image 
                src={settings.brandLogoUrl} 
                alt="Brand Logo" 
                width={150} 
                height={32}
                className="h-full w-auto object-contain"
                />
            ) : (
                <>
                <BrainCircuit className="w-8 h-8" />
                <span className="text-2xl">ShopAssist AI</span>
                </>
            )}
          </CardTitle>
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
                          ? ticket?.customer.avatar
                          : message.role === "assistant"
                          ? undefined
                          : settings.agentAvatar
                      }
                    />
                    <AvatarFallback>
                      {message.role === "user"
                        ? ticket?.customer.name.charAt(0)
                        : message.role === "assistant"
                        ? "A"
                        : settings.agentName?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      message.role === "user" && "flex-row-reverse"
                    )}
                  >
                     <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 self-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setReplyingTo(message)}
                    >
                      <MessageSquareReply className="w-4 h-4" />
                    </Button>
                    <div
                      className={cn(
                        "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl animate-in fade-in zoom-in-95",
                        message.role === "user"
                          ? "bg-user-bubble text-user-foreground rounded-br-none"
                          : message.role === "agent"
                          ? "bg-agent-bubble text-agent-foreground rounded-bl-none"
                          : "bg-assistant-bubble text-assistant-foreground border rounded-bl-none"
                      )}
                    >
                      {message.replyTo && (
                        <RepliedMessage
                          message={message.replyTo}
                          settings={settings}
                        />
                      )}
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
                      {message.content && <div
                        className="text-sm prose"
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {linkify(message.content)}
                      </div>}
                      <p
                        className={cn(
                          "text-xs mt-1",
                          message.role === "user"
                            ? "text-user-foreground/70"
                            : message.role === "agent"
                            ? "text-agent-foreground/70"
                            : "text-assistant-foreground/70"
                        )}
                      >
                        {format(new Date(message.createdAt), "p")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                     <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl bg-card border rounded-bl-none">
                    <TypingIndicator />
                  </div>
                </div>
              )}
               {showAgentConnected && settings.agentName && (
                    <AgentConnectionStatus agentName={settings.agentName} />
                )}
            </div>
          </ScrollArea>
           {replyingTo && <ReplyPreview message={replyingTo} onCancel={() => setReplyingTo(null)} />}
          <div className="p-4 border-t bg-background/80">
            {selectedFile && <FilePreviewInput file={selectedFile} onRemove={() => setSelectedFile(null)} />}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
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
                disabled={isSending}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={ticket?.status === 'closed' ? "This ticket is closed. Type to re-open." : "Type your message..."}
                className="flex-1 resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && !selectedFile) || isSending}
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowUp className="w-5 h-5" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
