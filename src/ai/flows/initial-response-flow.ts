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

const InitialResponseInputSchema = z.object({
  query: z.string().describe('The customer inquiry.'),
  knowledgeBase: z.string().optional().describe('Contextual knowledge base to inform the response.'),
});

export type InitialResponseInput = z.infer<typeof InitialResponseInputSchema>;

const InitialResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated initial response.'),
});

export type InitialResponseOutput = z.infer<typeof InitialResponseOutputSchema>;

export async function initialResponse(input: InitialResponseInput): Promise<InitialResponseOutput> {
  return initialResponseFlow(input);
}

const knowledgeBaseTool = ai.defineTool({
  name: 'knowledgeBase',
  description: 'Retrieves information from the knowledge base provided by the user.',
  inputSchema: z.object({
    query: z.string().describe('The query to search the knowledge base for.'),
  }),
  outputSchema: z.string(),
}, async (input) => {
  // In a real application, this would call a service to retrieve data from the knowledge base.
  // For this example, we'll just return the knowledge base itself.
  return input.query;
});


const initialResponsePrompt = ai.definePrompt({
  name: 'initialResponsePrompt',
  input: {schema: InitialResponseInputSchema},
  output: {schema: InitialResponseOutputSchema},
  tools: [knowledgeBaseTool],
  system: `You are a customer support AI assistant. Your goal is to provide helpful initial responses to customer inquiries.
  You have access to a knowledge base tool that you can use to answer questions. If the user's question can be answered using the knowledge base, use the tool.
  If the knowledge base doesn't contain the answer, respond politely and inform the user that a human agent will be with them shortly.`,
  prompt: `{{query}}`,
});

const initialResponseFlow = ai.defineFlow(
  {
    name: 'initialResponseFlow',
    inputSchema: InitialResponseInputSchema,
    outputSchema: InitialResponseOutputSchema,
  },
  async input => {
    const {output} = await initialResponsePrompt(input);
    return output!;
  }
);
