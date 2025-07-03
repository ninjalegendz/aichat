
"use server";

import { initialResponse } from "@/ai/flows/initial-response-flow";
import { summarizeTicket } from "@/ai/flows/summarize-ticket-flow";
import { getMessages, updateTicket } from "@/lib/firestore-service";

const KNOWLEDGE_BASE = `
ShopAssist AI FAQ:
Q: How do I track my order?
A: You can track your order by visiting the 'Track Order' page on our website and entering your order number and email address.
Q: What is your return policy?
A: We accept returns within 30 days of purchase. The item must be unused and in its original packaging. Please visit our 'Returns' page to initiate a return.
Q: How can I contact customer support?
A: You can contact us via this chat, or email us at support@example.com. Our support hours are 9 AM to 5 PM, Monday to Friday.
`;

export async function getAiResponse(query: string, chatHistory: string) {
  try {
    const response = await initialResponse({
      query: `Given the following chat history:\n${chatHistory}\n\nNew user query: ${query}`,
      knowledgeBase: KNOWLEDGE_BASE,
    });
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
