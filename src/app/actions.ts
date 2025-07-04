
"use server";

import { initialResponse } from "@/ai/flows/initial-response-flow";
import { summarizeTicket } from "@/ai/flows/summarize-ticket-flow";
import { getMessages, updateTicket, getSettings, updateSettings, addMessage, deleteMessages } from "@/lib/firestore-service";
import type { Settings } from "@/lib/types";

export async function getAiResponse(query: string, chatHistory: string, ticketId: string) {
  try {
    const settings = await getSettings();
    const response = await initialResponse({
      currentQuery: query,
      chatHistory: chatHistory,
      knowledgeBase: settings.knowledgeBase,
      systemPrompt: settings.systemPrompt,
      ticketId: ticketId,
    });

    if (response.needsAttention) {
        await updateTicket(ticketId, { status: 'needs-attention' });
    }

    return response.response;
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "I'm sorry, I'm having trouble connecting. A human agent will be with you shortly.";
  }
}

export async function summarizeAndSaveTicket(ticketId: string) {
  const messages = await getMessages(ticketId);
  if (!messages || messages.length === 0) {
    await updateTicket(ticketId, { summary: "New conversation" });
    return "New conversation";
  }
  const chatHistory = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  try {
    const response = await summarizeTicket({ chatHistory });
    await updateTicket(ticketId, { summary: response.summary });
    return response.summary;
  } catch (error) {
    console.error("Error summarizing ticket:", error);
    await updateTicket(ticketId, { summary: "Could not generate summary." });
    return "Could not generate summary.";
  }
}

export async function getSettingsAction(): Promise<Settings> {
    return getSettings();
}

export async function updateSettingsAction(data: Partial<Settings>): Promise<void> {
    await updateSettings(data);
}

export async function deleteMessagesAction(ticketId: string, messageIds: string[]): Promise<void> {
    await deleteMessages(ticketId, messageIds);
}
