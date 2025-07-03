
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clipboard, Code } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const Snippet = `
<!-- ShopAssist AI Embed Start -->
<style>
  #shopassist-bubble {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-color: #64B5F6; /* Corresponds to your primary color */
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    transition: transform 0.2s ease-in-out;
  }
  #shopassist-bubble:hover {
    transform: scale(1.1);
  }
  #shopassist-bubble svg {
    width: 32px;
    height: 32px;
    color: white;
  }
  #shopassist-iframe-container {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 400px;
    height: 80vh;
    max-height: 600px;
    border-radius: 12px;
    overflow: hidden;
    display: none;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 9998;
    transition: opacity 0.3s ease, transform 0.3s ease;
    opacity: 0;
    transform: translateY(20px);
  }
  #shopassist-iframe-container.active {
    display: block;
    opacity: 1;
    transform: translateY(0);
  }
  #shopassist-iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
</style>
<div id="shopassist-bubble">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
  </svg>
</div>
<div id="shopassist-iframe-container">
  <iframe id="shopassist-iframe" src="${typeof window !== 'undefined' ? window.location.origin : 'https://YOUR_APP_URL.com'}"></iframe>
</div>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const bubble = document.getElementById('shopassist-bubble');
    const iframeContainer = document.getElementById('shopassist-iframe-container');
    
    bubble.addEventListener('click', () => {
      iframeContainer.classList.toggle('active');
    });
  });
</script>
<!-- ShopAssist AI Embed End -->
`;


export default function EmbedSnippetPage() {
    const [hasCopied, setHasCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(Snippet.trim());
        setHasCopied(true);
        toast({
            title: "Copied to clipboard!",
            description: "You can now paste the snippet into your website's HTML.",
        });
        setTimeout(() => setHasCopied(false), 2000);
    }
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4 md:p-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-headline">
            <Code className="w-8 h-8 text-primary" />
            Embed ShopAssist AI
          </CardTitle>
          <CardDescription>
            Copy and paste this snippet into your website's HTML just before the closing 
            <code>&lt;/body&gt;</code> tag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
             <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-code">
                <code>{Snippet.trim()}</code>
            </pre>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleCopy}>
                {hasCopied ? <Check className="w-5 h-5 text-green-500"/> : <Clipboard className="w-5 h-5" />}
            </Button>
          </div>
          <div className="mt-6 text-center">
            <Link href="/admin">
                <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
