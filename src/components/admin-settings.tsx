
"use client";

import { getSettingsAction, updateSettingsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { hexToHslString } from "@/lib/utils";
import type { Settings } from "@/lib/types";
import { ArrowLeft, BrainCog, Bot, Loader2, Palette, Save, User, MessageCircle, Plus, Trash2, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

export function AdminSettings() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSavingTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const currentSettings = await getSettingsAction();
        setSettings(currentSettings);
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load settings.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));

    if (name === 'primaryColor' || name === 'accentColor' || name === 'backgroundColor') {
        const propertyName = name === 'primaryColor' ? '--primary' : name === 'accentColor' ? '--accent' : '--background';
        if (value) {
            document.documentElement.style.setProperty(propertyName, hexToHslString(value));
        }
    }
  };
  
  const handleAddQuickReply = () => {
    const newReply = { id: crypto.randomUUID(), text: "" };
    setSettings(prev => ({
      ...prev,
      quickReplies: [...(prev.quickReplies || []), newReply]
    }));
  };

  const handleQuickReplyChange = (id: string, text: string) => {
    setSettings(prev => ({
      ...prev,
      quickReplies: (prev.quickReplies || []).map(reply =>
        reply.id === id ? { ...reply, text } : reply
      )
    }));
  };
  
  const handleDeleteQuickReply = (id: string) => {
    setSettings(prev => ({
      ...prev,
      quickReplies: (prev.quickReplies || []).filter(reply => reply.id !== id)
    }));
  };

  const handleSaveChanges = async () => {
    startSavingTransition(async () => {
      try {
        const settingsToSave = {
            ...settings,
            quickReplies: (settings.quickReplies || []).filter(r => r.text.trim() !== '')
        }
        await updateSettingsAction(settingsToSave);
        setSettings(settingsToSave);
        toast({
          title: "Settings Saved",
          description: "Your changes have been saved successfully.",
        });
      } catch (error) {
        console.error("Failed to save settings:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save settings.",
        });
      }
    });
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading Settings...</p>
        </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <BrainCog className="w-7 h-7" /> AI & App Settings
          </CardTitle>
          <CardDescription>
            Configure the behavior, knowledge, and appearance of your AI assistant and app.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3']} className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-medium">
                        <div className="flex items-center gap-3"><User className="w-5 h-5"/> AI Profile</div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="agentName">Agent Name</Label>
                                <Input
                                    id="agentName"
                                    name="agentName"
                                    value={settings.agentName || ""}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Support Bot"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agentAvatar">Agent Avatar URL</Label>
                                <Input
                                    id="agentAvatar"
                                    name="agentAvatar"
                                    value={settings.agentAvatar || ""}
                                    onChange={handleInputChange}
                                    placeholder="https://example.com/avatar.png"
                                />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                    <AccordionTrigger className="text-lg font-medium">
                        <div className="flex items-center gap-3"><Bot className="w-5 h-5"/> AI Behavior</div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="systemPrompt">System Prompt</Label>
                            <Textarea
                            id="systemPrompt"
                            name="systemPrompt"
                            value={settings.systemPrompt || ""}
                            onChange={handleInputChange}
                            rows={8}
                            placeholder="Define the AI's personality and goals..."
                            />
                            <p className="text-xs text-muted-foreground">This is the core instruction for the AI. It defines its role, personality, and primary objectives.</p>
                        </div>
                        <div className="space-y-2 mt-6">
                            <Label htmlFor="knowledgeBase">Knowledge Base (FAQ)</Label>
                            <Textarea
                            id="knowledgeBase"
                            name="knowledgeBase"
                            value={settings.knowledgeBase || ""}
                            onChange={handleInputChange}
                            rows={12}
                            placeholder="Add FAQs or other information..."
                            />
                            <p className="text-xs text-muted-foreground">Provide context that the AI can use to answer questions. Use a simple Q&A format for best results.</p>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="item-3">
                    <AccordionTrigger className="text-lg font-medium">
                        <div className="flex items-center gap-3"><Palette className="w-5 h-5"/> Theme & Branding (Customer-Facing)</div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="brandLogoUrl">Brand Logo URL</Label>
                            <Input
                                id="brandLogoUrl"
                                name="brandLogoUrl"
                                value={settings.brandLogoUrl || ""}
                                onChange={handleInputChange}
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <div className="space-y-2">
                                <Label htmlFor="primaryColor">Primary Color</Label>
                                <Input
                                    id="primaryColor"
                                    name="primaryColor"
                                    type="color"
                                    value={settings.primaryColor || "#64B5F6"}
                                    onChange={handleInputChange}
                                    className="p-1 h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accentColor">Accent Color</Label>
                                <Input
                                    id="accentColor"
                                    name="accentColor"
                                    type="color"
                                    value={settings.accentColor || "#26A69A"}
                                    onChange={handleInputChange}
                                    className="p-1 h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="backgroundColor">Background Color</Label>
                                <Input
                                    id="backgroundColor"
                                    name="backgroundColor"
                                    type="color"
                                    value={settings.backgroundColor || "#F0F4F7"}
                                    onChange={handleInputChange}
                                    className="p-1 h-10"
                                />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-4">
                    <AccordionTrigger className="text-lg font-medium">
                         <div className="flex items-center gap-3"><MessageCircle className="w-5 h-5"/> Chat Bubble Colors (Customer-Facing)</div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                        <div className="p-4 border rounded-lg">
                             <h4 className="text-md font-semibold mb-4">User Message Bubbles</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="userBubbleColor">Bubble Color</Label>
                                    <Input
                                        id="userBubbleColor"
                                        name="userBubbleColor"
                                        type="color"
                                        value={settings.userBubbleColor || "#64B5F6"}
                                        onChange={handleInputChange}
                                        className="p-1 h-10"
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="userBubbleTextColor">Text Color</Label>
                                    <Input
                                        id="userBubbleTextColor"
                                        name="userBubbleTextColor"
                                        type="color"
                                        value={settings.userBubbleTextColor || "#FFFFFF"}
                                        onChange={handleInputChange}
                                        className="p-1 h-10"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                             <h4 className="text-md font-semibold mb-4">Agent Message Bubbles</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="agentBubbleColor">Bubble Color</Label>
                                    <Input
                                        id="agentBubbleColor"
                                        name="agentBubbleColor"
                                        type="color"
                                        value={settings.agentBubbleColor || "#42A5F5"}
                                        onChange={handleInputChange}
                                        className="p-1 h-10"
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="agentBubbleTextColor">Text Color</Label>
                                    <Input
                                        id="agentBubbleTextColor"
                                        name="agentBubbleTextColor"
                                        type="color"
                                        value={settings.agentBubbleTextColor || "#FFFFFF"}
                                        onChange={handleInputChange}
                                        className="p-1 h-10"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                             <h4 className="text-md font-semibold mb-4">AI Assistant Message Bubbles</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="assistantBubbleColor">Bubble Color</Label>
                                    <Input
                                        id="assistantBubbleColor"
                                        name="assistantBubbleColor"
                                        type="color"
                                        value={settings.assistantBubbleColor || "#FFFFFF"}
                                        onChange={handleInputChange}
                                        className="p-1 h-10"
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="assistantBubbleTextColor">Text Color</Label>
                                    <Input
                                        id="assistantBubbleTextColor"
                                        name="assistantBubbleTextColor"
                                        type="color"
                                        value={settings.assistantBubbleTextColor || "#212121"}
                                        onChange={handleInputChange}
                                        className="p-1 h-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                    <AccordionTrigger className="text-lg font-medium">
                        <div className="flex items-center gap-3"><Send className="w-5 h-5"/> Quick Replies (for Agents)</div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                        <p className="text-sm text-muted-foreground">Create and manage pre-written responses that agents can quickly access by typing "/" in the chat input.</p>
                        <div className="space-y-3">
                        {(settings.quickReplies || []).map((reply) => (
                            <div key={reply.id} className="flex items-center gap-2">
                            <Input
                                value={reply.text}
                                onChange={(e) => handleQuickReplyChange(reply.id, e.target.value)}
                                placeholder="Enter quick reply text..."
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuickReply(reply.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            </div>
                        ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleAddQuickReply}>
                            <Plus className="mr-2 h-4 w-4" /> Add Quick Reply
                        </Button>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
         <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t">
             <Link href="/admin" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>
            </Link>
            <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </CardFooter>
      </Card>
    </div>
  );
}
