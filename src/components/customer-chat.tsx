
"use client";

import type { Message, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowUp, BrainCircuit, ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { getAiResponse } from "@/app/actions";
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
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";

const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
  </div>
);

export function CustomerChat({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showOrderInput, setShowOrderInput] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const { toast } = useToast();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const ticketRef = doc(db, "tickets", ticketId);
    const unsubscribeTicket = onSnapshot(ticketRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTicket({
          id: docSnap.id,
          ...data,
          lastUpdate: (data.lastUpdate as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Ticket);
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
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !ticket) return;

    const userMessage: Omit<Message, "id" | "createdAt"> = {
      role: "user",
      content: input,
    };

    const currentInput = input;
    setInput("");
    await addMessage(ticketId, userMessage);

    if (ticket.status === "ai") {
      setIsAiTyping(true);
      startTransition(async () => {
        const tempUserMessage = { ...userMessage, id: 'temp', createdAt: new Date().toISOString() };
        const chatHistory = [...messages, tempUserMessage]
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");
        const aiResponseContent = await getAiResponse(currentInput, chatHistory);

        const aiMessage: Omit<Message, "id" | "createdAt"> = {
          role: "assistant",
          content: aiResponseContent,
        };

        await addMessage(ticketId, aiMessage);
        setIsAiTyping(false);
      });
    }
  };
  
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !ticket) return;

    startTransition(async () => {
      await updateTicket(ticketId, { orderNumber });
      const orderMessage: Omit<Message, "id" | "createdAt"> = {
        role: 'user',
        content: `Checking status for order #${orderNumber}`
      };
      await addMessage(ticketId, orderMessage);
      
      const aiResponseContent = await getAiResponse(
        `The user wants to know the status of order #${orderNumber}.`,
        ''
      );

      const aiMessage: Omit<Message, "id" | "createdAt"> = {
        role: "assistant",
        content: aiResponseContent,
      };

      await addMessage(ticketId, aiMessage);
      
      setOrderNumber("");
      setShowOrderInput(false);
      toast({
        title: "Order number submitted",
        description: "An agent will verify your order details shortly.",
      });
    });
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-primary font-headline">
            <BrainCircuit className="w-8 h-8" />
            ShopAssist AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
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
                      "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl animate-in fade-in zoom-in-95",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border rounded-bl-none"
                    )}
                  >
                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
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
                    <AvatarImage
                      src={`https://placehold.co/40x40/26A69A/FFFFFF/png?text=A`}
                    />
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
            {ticket?.status !== 'closed' && (
              <>
                {!showOrderInput ? (
                   <div className="mb-2">
                    <Button variant="outline" size="sm" onClick={() => setShowOrderInput(true)}>
                      <ShoppingCart className="mr-2 h-4 w-4"/>
                      Order Status
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleOrderSubmit} className="flex items-center gap-2 mb-2 animate-in fade-in-20">
                     <Input
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="Enter 4 digits from your order #, e.g. 1234"
                        pattern="\d{4}"
                        maxLength={4}
                        className="flex-1"
                        required
                        disabled={isPending}
                      />
                    <Button type="submit" size="sm" disabled={isPending}>Submit</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowOrderInput(false)}>Cancel</Button>
                  </form>
                )}
              </>
            )}

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
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isPending || isAiTyping || ticket?.status === 'closed'}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isPending || isAiTyping || ticket?.status === 'closed'}
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
