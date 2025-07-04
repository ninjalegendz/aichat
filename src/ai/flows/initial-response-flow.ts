
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
        prompt: `You are an expert customer service AI. Your primary goal is to resolve customer issues efficiently using the provided Knowledge Base. You must escalate to a human agent ONLY as a last resort.

**Your process must be:**
1.  **Analyze Intent:** First, carefully analyze the "New User Message" to understand the customer's underlying intent or question. Do not just look for keywords.
2.  **Consult Knowledge Base:** Search the "Knowledge Base" for information that is semantically related to the user's intent. The answer may not be a word-for-word match, but you should find the relevant section.
3.  **Formulate Response:**
    *   **If you find a relevant answer:** Formulate a helpful response based on the knowledge base information. In this case, you **MUST** set the \`needsAttention\` flag to \`false\`.
    *   **If you CANNOT find an answer, OR the user is clearly frustrated, OR the user explicitly asks for a human:** Formulate a response informing the user you are connecting them to an agent. In this case, you **MUST** set the \`needsAttention\` flag to \`true\`. This is the ONLY time you should set it to true.

**CRITICAL INSTRUCTION:** The \`needsAttention\` flag and your text \`response\` must be consistent. If you say you are getting an agent, \`needsAttention\` **MUST** be \`true\`. If you are answering the question yourself, \`needsAttention\` **MUST** be \`false\`.

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
