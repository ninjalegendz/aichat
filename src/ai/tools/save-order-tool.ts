'use server';
/**
 * @fileOverview A Genkit tool for saving a customer's order number.
 *
 * - saveOrderNumber - A tool that updates a ticket with an order number.
 */
import {ai} from '@/ai/genkit';
import {updateTicket} from '@/lib/firestore-service';
import {z} from 'zod';

export const saveOrderNumber = ai.defineTool(
  {
    name: 'saveOrderNumber',
    description:
      "Use this tool to save the customer's 4-digit order number to the support ticket. You must have the ticket ID to use this tool.",
    inputSchema: z.object({
      ticketId: z.string().describe('The ID of the support ticket.'),
      orderNumber: z
        .string()
        .describe("The customer's 4-digit order number."),
    }),
    outputSchema: z.string(),
  },
  async ({ticketId, orderNumber}) => {
    await updateTicket(ticketId, {orderNumber});
    return `Successfully saved order number ${orderNumber} to ticket ${ticketId}.`;
  }
);
