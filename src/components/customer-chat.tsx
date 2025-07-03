
"use client";

import type { Message, Settings, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { linkify } from "@/lib/linkify";
import { ArrowUp, BrainCircuit, Loader2 } from "lucide-react";
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

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      setTimeout(() => {
        viewport.scrollTop = viewport.scrollHeight;
      }, 0);
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

        // Check if agent just connected
        if (oldTicket?.status !== 'agent' && newTicket.status === 'agent') {
            setShowAgentConnected(true);
            setTimeout(() => setShowAgentConnected(false), 5000); // Hide after 5s
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
    
    // Initial scroll to bottom
    setTimeout(scrollToBottom, 200);

    return () => {
      unsubscribeTicket();
      unsubscribeMessages();
    };
  }, [ticketId]);

  // Handle scrolling when new messages are added
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      // Only auto-scroll if user is already near the bottom
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

    startSendingTransition(async () => {
      await addMessage(ticketId, { role: 'user', content: textToSend });
      
      if (ticket.status === 'closed') {
        // Re-open the ticket and flag for attention
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


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-primary font-headline">
            {settings.brandLogoUrl ? (
                <Image 
                src={settings.brandLogoUrl} 
                alt="Brand Logo" 
                width={150} 
                height={32}
                className="h-8 w-auto object-contain"
                />
            ) : (
                <>
                <BrainCircuit className="w-8 h-8" />
                <span>ShopAssist AI</span>
                </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="space-y-6 p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role !== "user" && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={
                          message.role === "assistant"
                            ? undefined // AI has no specific avatar, uses fallback
                            : settings.agentAvatar
                        }
                      />
                      <AvatarFallback>
                        {message.role === "assistant" ? "A" : settings.agentName?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl animate-in fade-in zoom-in-95",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border rounded-bl-none"
                    )}
                  >
                    <div className="text-sm prose" style={{ whiteSpace: 'pre-wrap' }}>{linkify(message.content)}</div>

                    <p
                      className={cn(
                        "text-xs mt-1",
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70"
                      )}
                    >
                      {format(new Date(message.createdAt), "p")}
                    </p>
                  </div>
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
