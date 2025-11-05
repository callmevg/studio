'use server';

/**
 * @fileOverview A flow to import a graph definition from a JSON file and analyze it for potential issues or improvements.
 *
 * - importGraphDefinition - A function that handles the graph definition import and analysis process.
 * - ImportGraphDefinitionInput - The input type for the importGraphDefinition function.
 * - ImportGraphDefinitionOutput - The return type for the importGraphDefinition function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImportGraphDefinitionInputSchema = z.object({
  graphDefinition: z
    .string()
    .describe('A JSON string representing the graph definition, including elements and flows.'),
});
export type ImportGraphDefinitionInput = z.infer<typeof ImportGraphDefinitionInputSchema>;

const ImportGraphDefinitionOutputSchema = z.object({
  analysisResults: z
    .string()
    .describe(
      'AI analysis results, including suggestions for optimal flow arrangements and identification of potentially redundant elements.'
    ),
});
export type ImportGraphDefinitionOutput = z.infer<typeof ImportGraphDefinitionOutputSchema>;

export async function importGraphDefinition(
  input: ImportGraphDefinitionInput
): Promise<ImportGraphDefinitionOutput> {
  return importGraphDefinitionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'importGraphDefinitionPrompt',
  input: {schema: ImportGraphDefinitionInputSchema},
  output: {schema: ImportGraphDefinitionOutputSchema},
  prompt: `You are an AI assistant that analyzes graph definitions (UI elements and flows) imported from a JSON file.

  Your task is to identify potential issues or improvements, such as suggesting more optimal flow arrangements or identifying potentially redundant elements.
  Provide a detailed analysis of the graph definition, including specific recommendations.

  Graph Definition:
  {{graphDefinition}}`,
});

const importGraphDefinitionFlow = ai.defineFlow(
  {
    name: 'importGraphDefinitionFlow',
    inputSchema: ImportGraphDefinitionInputSchema,
    outputSchema: ImportGraphDefinitionOutputSchema,
  },
  async input => {
    try {
      JSON.parse(input.graphDefinition);
    } catch (e: any) {
      throw new Error('Invalid JSON graph definition provided: ' + e.message);
    }

    const {output} = await prompt(input);
    return output!;
  }
);
