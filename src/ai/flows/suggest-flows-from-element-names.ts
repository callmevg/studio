'use server';
/**
 * @fileOverview This file defines a Genkit flow that suggests potential user flows based on the names of existing UI elements.
 *
 * - suggestFlowsFromElementNames - A function that generates flow suggestions from element names.
 * - SuggestFlowsFromElementNamesInput - The input type for the suggestFlowsFromElementNames function.
 * - SuggestFlowsFromElementNamesOutput - The return type for the suggestFlowsFromElementNames function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFlowsFromElementNamesInputSchema = z.object({
  elementNames: z
    .array(z.string())
    .describe('An array of UI element names to generate flows from.'),
});
export type SuggestFlowsFromElementNamesInput = z.infer<
  typeof SuggestFlowsFromElementNamesInputSchema
>;

const SuggestFlowsFromElementNamesOutputSchema = z.object({
  flowSuggestions: z
    .array(z.array(z.string()))
    .describe(
      'An array of suggested user flows, where each flow is an array of element names.'
    ),
});
export type SuggestFlowsFromElementNamesOutput = z.infer<
  typeof SuggestFlowsFromElementNamesOutputSchema
>;

export async function suggestFlowsFromElementNames(
  input: SuggestFlowsFromElementNamesInput
): Promise<SuggestFlowsFromElementNamesOutput> {
  return suggestFlowsFromElementNamesFlow(input);
}

const suggestFlowsFromElementNamesPrompt = ai.definePrompt({
  name: 'suggestFlowsFromElementNamesPrompt',
  input: {schema: SuggestFlowsFromElementNamesInputSchema},
  output: {schema: SuggestFlowsFromElementNamesOutputSchema},
  prompt: `You are a UX expert tasked with suggesting common user flows through a web application.

  Given the following UI element names, suggest several likely user flows.
  Each flow should be a sequence of element names that a user might follow to complete a task.
  Each flow should contain at least 2 elements, and no more than 5 elements.
  Try to suggest at least three different flows, and don't suggest the same flow more than once.

  Element Names:
  {{#each elementNames}}- {{{this}}}\n{{/each}}

  Format your response as a JSON object with a single key called "flowSuggestions", which is an array of arrays.  Each inner array is a flow, and each element of the inner array is an element name.  For example:
  {
    "flowSuggestions": [
      ["Home Page", "Login Dialog", "Dashboard"],
      ["Product List", "Product Details", "Add to Cart", "Checkout"],
      ["Settings Page", "Edit Profile", "Save Changes"]
    ]
  }
  `,
});

const suggestFlowsFromElementNamesFlow = ai.defineFlow(
  {
    name: 'suggestFlowsFromElementNamesFlow',
    inputSchema: SuggestFlowsFromElementNamesInputSchema,
    outputSchema: SuggestFlowsFromElementNamesOutputSchema,
  },
  async input => {
    const {output} = await suggestFlowsFromElementNamesPrompt(input);
    return output!;
  }
);
