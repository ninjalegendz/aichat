
"use client";

import type { Message, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowUp, Bot, User, BrainCircuit } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { getAiResponse } from "@/app/actions";
import { format } from "date-fns";

const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
  </div>
);

export function CustomerChat({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const loadTicket = () => {
    const storedTicket = localStorage.getItem(`shopassist_ticket_${ticketId}`);
    if (storedTicket) {
      setTicket(JSON.parse(storedTicket));
    }
  };

  useEffect(() => {
    loadTicket();
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `shopassist_ticket_${ticketId}`) {
        loadTicket();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const handleSendMessage = () => {
    if (!input.trim() || !ticket) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    const updatedTicket: Ticket = {
      ...ticket,
      messages: [...ticket.messages, userMessage],
      lastUpdate: new Date().toISOString(),
    };

    setTicket(updatedTicket);
    localStorage.setItem(`shopassist_ticket_${ticketId}`, JSON.stringify(updatedTicket));
    setInput("");
    
    if(updatedTicket.status === 'ai') {
      setIsAiTyping(true);
      startTransition(async () => {
        const chatHistory = updatedTicket.messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const aiResponseContent = await getAiResponse(input, chatHistory);
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aiResponseContent,
          createdAt: new Date().toISOString(),
        };

        const finalTicket = {
            ...updatedTicket,
            messages: [...updatedTicket.messages, aiMessage]
        };

        setTicket(finalTicket);
        localStorage.setItem(`shopassist_ticket_${ticketId}`, JSON.stringify(finalTicket));
        setIsAiTyping(false);
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-primary font-headline">
            <BrainCircuit className="w-8 h-8"/>
            ShopAssist AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {ticket?.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role !== "user" && (
                    <Avatar className="w-8 h-8">
                       <AvatarImage src={message.role === 'assistant' ? `https://placehold.co/40x40/26A69A/FFFFFF/png?text=A` : `https://placehold.co/40x40/1E88E5/FFFFFF/png?text=S`} />
                       <AvatarFallback>{message.role === 'assistant' ? 'A' : 'S'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                      "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl animate-in fade-in zoom-in-95",
                      message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card border rounded-bl-none',
                    )}>
                    <p className="text-sm">{message.content}</p>
                    <p className={cn("text-xs mt-1", message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>{format(new Date(message.createdAt), 'p')}</p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="w-8 h-8">
                       <AvatarImage src={ticket.customer.avatar} />
                       <AvatarFallback>{ticket.customer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isAiTyping && (
                <div className="flex items-start gap-3 justify-start">
                   <Avatar className="w-8 h-8">
                        <AvatarImage src={`https://placehold.co/40x40/26A69A/FFFFFF/png?text=A`} />
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl bg-card border rounded-bl-none">
                        <TypingIndicator />
                    </div>
                </div>
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
                placeholder="Type your message..."
                className="flex-1 resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isPending || isAiTyping}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isPending || isAiTyping}>
                <ArrowUp className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
