
"use client";

import type { Message, Settings, Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowUp, BrainCircuit, File as FileIcon, FileImage, Loader2, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { getAiResponse, getSettingsAction, handleFileUploadAction } from "@/app/actions";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { addMessage } from "@/lib/firestore-service";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  Timestamp,
} from "firebase/firestore";
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
  const [isSending, startSendingTransition] = useTransition();
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const { toast } = useToast();
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    getSettingsAction().then(setSettings);

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
    if (!ticket) return;
    const textToSend = input.trim();
    const filesToSend = [...filesToUpload];
    if (!textToSend && filesToSend.length === 0) return;

    setInput('');
    setFilesToUpload([]);

    startSendingTransition(async () => {
      if (ticket.status === 'ai') {
        setIsAiTyping(true);
      }

      // Upload files first, each as a separate message
      for (const file of filesToSend) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ticketId', ticketId);
        formData.append('role', 'user');
        await handleFileUploadAction(formData);
      }

      // Then, send the text message if it exists
      if (textToSend) {
        await addMessage(ticketId, { role: 'user', content: textToSend });
      }

      // If the ticket is handled by AI, get a response
      if (ticket.status === 'ai') {
        const tempUserMessage = { role: 'user', content: textToSend, id: 'temp-user', createdAt: new Date().toISOString() };
        const tempFileMessages = filesToSend.map((file, i) => ({ role: 'user', content: `[User uploaded file: ${file.name}]`, id: `temp-file-${i}`, createdAt: new Date().toISOString() }));
        
        const chatHistoryForAI = [...messages, ...tempFileMessages, tempUserMessage]
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        const aiQuery = [textToSend, ...filesToSend.map(f => `[user uploaded file: ${f.name}]`)].filter(Boolean).join('\n');
        
        const aiResponseContent = await getAiResponse(aiQuery, chatHistoryForAI, ticketId);
        
        await addMessage(ticketId, { role: "assistant", content: aiResponseContent });
        setIsAiTyping(false);
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    setFilesToUpload(prev => [...prev, ...files]);
    toast({ title: `${files.length} file(s) ready for upload.` });
    
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const removeFileToUpload = (fileToRemove: File) => {
    setFilesToUpload(prev => prev.filter(file => file !== fileToRemove));
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
                      "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl animate-in fade-in zoom-in-95",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-card border rounded-bl-none"
                    )}
                  >
                   {message.attachment ? (
                        message.attachment.type.startsWith('image/') ? (
                            <Link href={message.attachment.url} target="_blank" rel="noopener noreferrer">
                                <Image src={message.attachment.url} alt={message.attachment.name} width={200} height={200} className="rounded-md object-cover"/>
                            </Link>
                        ) : (
                            <Link href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium underline">
                                <Paperclip className="w-4 h-4"/>
                                {message.attachment.name}
                            </Link>
                        )
                    ) : (
                        <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                    )}

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
            {filesToUpload.length > 0 && (
                <div className="mb-2 p-2 border rounded-md">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">Files to upload:</p>
                    <div className="flex flex-wrap gap-2">
                    {filesToUpload.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-1.5 rounded-md bg-muted text-sm text-muted-foreground">
                        {file.type.startsWith('image/') ? <FileImage className="w-4 h-4 text-primary" /> : <FileIcon className="w-4 h-4 text-muted-foreground" />}
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFileToUpload(file)}>
                            <X className="w-4 h-4" />
                        </Button>
                        </div>
                    ))}
                    </div>
                </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" multiple/>
               <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending || ticket?.status === 'closed'}>
                  <Paperclip className="w-5 h-5"/>
              </Button>
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
                disabled={isSending || ticket?.status === 'closed'}
              />
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && filesToUpload.length === 0) || isSending || ticket?.status === 'closed'}
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
