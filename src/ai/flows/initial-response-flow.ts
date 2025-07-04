
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
  currentQuery: z.string().describe('The latest customer message.'),
  chatHistory: z.string().optional().describe('The full conversation history.'),
  knowledgeBase: z.string().optional().describe('Contextual knowledge base to inform the response.'),
  systemPrompt: z.string().optional().describe('The system prompt that defines the AIs behavior.'),
  ticketId: z.string().describe('The ID of the current support ticket.'),
});

export type InitialResponseInput = z.infer<typeof InitialResponseInputSchema>;

const InitialResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated initial response to the user.'),
  needsAttention: z
    .boolean()
    .describe(
      "Set to true ONLY if the user's query cannot be answered using the Knowledge Base, if the user explicitly asks for a human, or if the user is expressing significant frustration. Otherwise, you must set this to false and answer the query yourself."
    ),
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
        prompt: `You MUST follow these instructions to determine if the user needs a human agent. The user needs a human agent ONLY if their query cannot be answered with the Knowledge Base, if they ask for a human, or if they are very frustrated.
        
Analyze the user's message and the conversation history. First, try to answer the user's question using the knowledge base. Only if you cannot find an answer should you escalate.

Ticket ID: ${input.ticketId}

Knowledge Base:
${input.knowledgeBase}

Chat History:
${input.chatHistory}

New User Message: ${input.currentQuery}`,
        output: {
            schema: InitialResponseOutputSchema,
        },
        tools: [saveOrderNumber],
    });
    return output!;
  }
);
