
'use server';

/**
 * @fileOverview An AI agent for providing initial responses to customer inquiries.
 *
 * - initialResponse - A function that generates initial responses to customer inquiries.
 * - InitialResponseInput - The input type for the initialResponse function.
 * - InitialResponseOutput - The return type for the initialResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { saveOrderNumber } from '../tools/save-order-tool';

const InitialResponseInputSchema = z.object({
  currentQuery: z.string().describe('The latest customer message, which may include text and references to uploaded files.'),
  chatHistory: z.string().optional().describe('The full conversation history.'),
  knowledgeBase: z.string().optional().describe('Contextual knowledge base to inform the response.'),
  systemPrompt: z.string().optional().describe('The system prompt that defines the AIs behavior.'),
  ticketId: z.string().describe('The ID of the current support ticket.'),
});

export type InitialResponseInput = z.infer<typeof InitialResponseInputSchema>;

const InitialResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated initial response.'),
});

export type InitialResponseOutput = z.infer<typeof InitialResponseOutputSchema>;

export async function initialResponse(input: InitialResponseInput): Promise<InitialResponseOutput> {
  return initialResponseFlow(input);
}

const initialResponseFlow = ai.defineFlow(
  {
    name: 'initialResponseFlow',
    inputSchema: InitialResponseInputSchema,
    outputSchema: InitialResponseOutputSchema,
  },
  async (input) => {
    const {output} = await ai.generate({
        system: input.systemPrompt,
        prompt: `Ticket ID: ${input.ticketId}\n\nKnowledge Base:\n${input.knowledgeBase}\n\nChat History:\n${input.chatHistory}\n\nNew User Message: ${input.currentQuery}`,
        output: {
            schema: InitialResponseOutputSchema,
        },
        tools: [saveOrderNumber],
    });
    return output!;
  }
);
