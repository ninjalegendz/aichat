
"use client";

import { getSettingsAction, updateSettingsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Settings } from "@/lib/types";
import { BrainCog, Loader2, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

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
  };

  const handleSaveChanges = async () => {
    startSavingTransition(async () => {
      try {
        await updateSettingsAction(settings);
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
        <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">Loading Settings...</p>
        </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BrainCog className="w-7 h-7" /> AI Settings
          </CardTitle>
          <CardDescription>
            Configure the behavior and knowledge of your AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
          <div className="space-y-2">
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

          <div className="flex justify-end">
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
