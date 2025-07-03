
"use client";

import type { Message, Settings, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { linkify } from "@/lib/linkify";
import { ArrowUp, BrainCircuit, Loader2, MessageSquareReply, X } from "lucide-react";
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

  const scrollAreaRef = useRef<HTMLDivElement>(null);
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
    if (!ticket || !textToSend) return;

    setInput('');
    const replyInfo = replyingTo ? {
      messageId: replyingTo.id,
      content: replyingTo.content,
      role: replyingTo.role,
    } : undefined;
    setReplyingTo(null);

    startSendingTransition(async () => {
      await addMessage(ticketId, { role: 'user', content: textToSend, replyTo: replyInfo });
      
      if (ticket.status === 'closed') {
        await updateTicket(ticketId, { status: 'needs-attention' });
      } else if (ticket.status === 'ai') {
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
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                   {message.role !== "user" && (
                     <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                            <AvatarImage
                                src={
                                message.role === "assistant"
                                    ? undefined
                                    : settings.agentAvatar
                                }
                            />
                            <AvatarFallback>
                                {message.role === "assistant" ? "A" : settings.agentName?.charAt(0) || 'S'}
                            </AvatarFallback>
                        </Avatar>
                     </div>
                  )}

                  <div
                    className={cn(
                      "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl animate-in fade-in zoom-in-95",
                      message.role === 'user'
                      ? 'bg-user-bubble text-user-foreground rounded-br-none'
                      : message.role === 'agent'
                      ? 'bg-agent-bubble text-agent-foreground rounded-bl-none'
                      : 'bg-assistant-bubble text-assistant-foreground border rounded-bl-none'
                    )}
                  >
                     {message.replyTo && <RepliedMessage message={message.replyTo} settings={settings} />}
                    <div className="text-sm prose" style={{ whiteSpace: 'pre-wrap' }}>{linkify(message.content)}</div>
                    <p
                      className={cn(
                        "text-xs mt-1",
                         message.role === 'user'
                         ? 'text-user-foreground/70'
                         : message.role === 'agent'
                         ? 'text-agent-foreground/70'
                         : 'text-assistant-foreground/70'
                      )}
                    >
                      {format(new Date(message.createdAt), "p")}
                    </p>
                  </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 self-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setReplyingTo(message)}
                    >
                        <MessageSquareReply className="w-4 h-4" />
                    </Button>
                  {message.role === "user" && ticket?.customer && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={ticket.customer.avatar} />
                      <AvatarFallback>
                        {ticket.customer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isAiTyping && (
                <div className="flex items-start gap-3 justify-start">
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
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
                disabled={!input.trim() || isSending}
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
