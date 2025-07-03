'use server';
/**
 * @fileOverview Summarizes the customer's issue from the chat history.
 *
 * - summarizeTicket - A function that summarizes the customer's issue.
 * - SummarizeTicketInput - The input type for the summarizeTicket function.
 * - SummarizeTicketOutput - The return type for the summarizeTicket function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTicketInputSchema = z.object({
  chatHistory: z
    .string()
    .describe('The complete chat history between the customer and the AI.'),
});
export type SummarizeTicketInput = z.infer<typeof SummarizeTicketInputSchema>;

const SummarizeTicketOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the customer issue.'),
});
export type SummarizeTicketOutput = z.infer<typeof SummarizeTicketOutputSchema>;

export async function summarizeTicket(input: SummarizeTicketInput): Promise<SummarizeTicketOutput> {
  return summarizeTicketFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTicketPrompt',
  input: {schema: SummarizeTicketInputSchema},
  output: {schema: SummarizeTicketOutputSchema},
  prompt: `You are an expert support agent assistant. Please summarize the following chat history to identify the customer's primary issue. Be as concise as possible while retaining all important details.\n\nChat History:\n{{{chatHistory}}}`,
});

const summarizeTicketFlow = ai.defineFlow(
  {
    name: 'summarizeTicketFlow',
    inputSchema: SummarizeTicketInputSchema,
    outputSchema: SummarizeTicketOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
