
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookUser, Code, Contact, Settings, BrainCircuit } from 'lucide-react';
import { Badge } from './ui/badge';

interface DocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GuideSection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <AccordionItem value={title}>
        <AccordionTrigger className="text-lg font-semibold hover:no-underline">
            <div className="flex items-center gap-3">
                {icon}
                {title}
            </div>
        </AccordionTrigger>
        <AccordionContent className="prose prose-sm max-w-none dark:prose-invert">
            {children}
        </AccordionContent>
    </AccordionItem>
);

const CodeBlock = ({ children }: { children: React.ReactNode }) => (
    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-code text-foreground">
        <code>
            {children}
        </code>
    </pre>
);


export function DocumentationModal({ open, onOpenChange }: DocumentationModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-headline">
                        <BookUser className="w-8 h-8 text-primary" />
                        Application Guide
                    </DialogTitle>
                    <DialogDescription>
                        A complete guide to using and understanding the ShopAssist AI application.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        <Accordion type="multiple" defaultValue={['getting-started']} className="w-full">
                            <GuideSection title="Getting Started" icon={<Code className="w-5 h-5"/>}>
                                <h4>Firebase Setup</h4>
                                <p>This application relies on Firebase for authentication and database services. Before running the app, you must set up a Firebase project.</p>
                                <ol>
                                    <li>Create a project in the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a>.</li>
                                    <li>Create a Web App and copy the `firebaseConfig` object.</li>
                                    <li>Paste your credentials into <code>src/lib/firebase.ts</code>.</li>
                                    <li>Enable <strong>Email/Password</strong> Authentication and create a user (e.g., <code>admin@example.com</code> / <code>password</code>).</li>
                                    <li>Enable the <strong>Firestore Database</strong> and start it in "Test mode" for development.</li>
                                </ol>

                                <h4>Running Locally</h4>
                                <p>Once Firebase is configured, install dependencies and run the development server:</p>
                                <CodeBlock>
                                    npm install
                                    {"\n"}
                                    npm run dev
                                </CodeBlock>
                                <p>The app will be available at <code>http://localhost:9002</code> and the admin panel at <code>http://localhost:9002/admin</code>.</p>
                            </GuideSection>

                            <GuideSection title="Admin Panel Features" icon={<Contact className="w-5 h-5"/>}>
                                <h4>Ticket Management</h4>
                                <p>The main dashboard displays all customer tickets. Tickets are color-coded based on their status:</p>
                                <ul>
                                    <li><Badge variant="destructive">needs-attention</Badge>: The AI requires a human agent to take over.</li>
                                    <li><Badge variant="default">agent</Badge>: An agent is actively handling the chat.</li>
                                    <li><Badge variant="secondary">ai</Badge>: The AI is currently handling the chat.</li>
                                    <li><Badge variant="outline">closed</Badge>: The conversation has been resolved and closed.</li>
                                </ul>

                                <h4>Chat Interface</h4>
                                <ul>
                                    <li><strong>Take Over / Let AI Handle:</strong> Switch between agent and AI control for any ticket.</li>
                                    <li><strong>Replying:</strong> Click the reply icon next to any message to create a threaded reply.</li>
                                    <li><strong>Quick Replies:</strong> Type <code>/</code> in the input to bring up a list of pre-written responses. Continue typing to filter the list.</li>
                                    <li><strong>Message Selection:</strong> Click a message to select it. Hold <Badge variant="outline">Shift</Badge> and click another message to select a range. Selected messages can be deleted.</li>
                                    <li><strong>Download Transcript:</strong> In the "Customer Details" panel, you can download the full chat history as a TXT or JSON file.</li>
                                </ul>
                            </GuideSection>

                             <GuideSection title="Settings & Configuration" icon={<Settings className="w-5 h-5"/>}>
                                <h4>AI Profile & Behavior</h4>
                                <p>In the settings page, you can customize the AI's persona and operational logic.</p>
                                <ul>
                                    <li><strong>Agent Name & Avatar:</strong> Define the name and avatar for both human agents and the AI assistant in the chat interface.</li>
                                    <li><strong>System Prompt:</strong> This is the core instruction set for the AI. It dictates its personality, rules, and goals. Modifying this prompt can significantly change the AI's behavior.</li>
                                    <li><strong>Knowledge Base:</strong> Provide a simple Q&A or informational text that the AI will use as its primary source of truth for answering customer questions.</li>
                                </ul>

                                <h4>Theme & Branding</h4>
                                <p>Customize the look and feel of the customer-facing chat widget.</p>
                                <ul>
                                    <li>Set your brand's logo, primary colors, and chat bubble colors to match your website's design.</li>
                                </ul>

                                <h4>Quick Replies</h4>
                                <p>Manage the list of pre-written responses available to agents via the <code>/</code> command in the chat input.</p>
                            </GuideSection>

                             <GuideSection title="AI & Genkit" icon={<BrainCircuit className="w-5 h-5"/>}>
                                <h4>Core AI Flows</h4>
                                <p>The application's intelligence is powered by Google's Gemini model through Genkit. The core logic is defined in "flows":</p>
                                <ul>
                                    <li><code>src/ai/flows/initial-response-flow.ts</code>: Handles generating responses to new customer messages. This flow decides whether to answer a question or flag the ticket for human attention.</li>
                                    <li><code>src/ai/flows/summarize-ticket-flow.ts</code>: Generates a concise summary of a conversation, which is displayed in the ticket list.</li>
                                </ul>

                                <h4>Genkit Tools</h4>
                                <p>Genkit "tools" give the AI special abilities. This app includes one primary tool:</p>
                                <ul>
                                     <li><code>src/ai/tools/save-order-tool.ts</code>: This tool allows the AI to recognize when a user provides an order number and automatically save it to the ticket's details in Firestore. This is defined in the tool's description and input schema.</li>
                                </ul>
                                <p>You can extend the AI's capabilities by defining new tools for it to use (e.g., checking a database, calling an external API).</p>
                            </GuideSection>
                        </Accordion>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
