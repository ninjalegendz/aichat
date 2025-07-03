
"use client";

import { getSettingsAction, updateSettingsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { hexToHslString } from "@/lib/utils";
import type { Settings } from "@/lib/types";
import { ArrowLeft, BrainCog, Loader2, Palette, Save } from "lucide-react";
import Link from "next/link";
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

    // Live update for colors
    if (name === 'primaryColor' || name === 'accentColor' || name === 'backgroundColor') {
        const propertyName = name === 'primaryColor' ? '--primary' : name === 'accentColor' ? '--accent' : '--background';
        if (value) {
            document.documentElement.style.setProperty(propertyName, hexToHslString(value));
        }
    }
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
        <CardContent className="space-y-8">
          {/* AI Profile Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">AI Profile</h3>
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
          </div>

          <Separator />
          
          {/* AI Behavior Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">AI Behavior</h3>
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
          </div>

           <Separator />

           {/* Theme & Branding Settings */}
           <div>
             <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Palette/> Theme & Branding</h3>
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
           </div>

        </CardContent>
         <CardFooter className="flex justify-between items-center pt-6 border-t">
             <Link href="/admin">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>
            </Link>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
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
