'use server';

/**
 * @fileOverview A flow to verify certificate download links before sending them via WhatsApp.
 *
 * - verifyCertificateLinks - A function that verifies the certificate download links.
 * - VerifyCertificateLinksInput - The input type for the verifyCertificateLinks function.
 * - VerifyCertificateLinksOutput - The return type for the verifyCertificateLinks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyCertificateLinksInputSchema = z.object({
  downloadLinks: z.array(z.string().url()).describe('An array of certificate download links to verify.'),
});
export type VerifyCertificateLinksInput = z.infer<typeof VerifyCertificateLinksInputSchema>;

const VerifyCertificateLinksOutputSchema = z.object({
  verifiedLinks: z.array(z.string().url()).describe('An array of verified certificate download links.'),
  invalidLinks: z.array(z.string().url()).describe('An array of invalid certificate download links.'),
});
export type VerifyCertificateLinksOutput = z.infer<typeof VerifyCertificateLinksOutputSchema>;

export async function verifyCertificateLinks(input: VerifyCertificateLinksInput): Promise<VerifyCertificateLinksOutput> {
  return verifyCertificateLinksFlow(input);
}

const verifyLinksPrompt = ai.definePrompt({
  name: 'verifyLinksPrompt',
  input: {schema: VerifyCertificateLinksInputSchema},
  output: {schema: VerifyCertificateLinksOutputSchema},
  prompt: `You are a helpful assistant that verifies if a list of download links are valid and accessible.

  Given the following download links:
  {{#each downloadLinks}}
  - {{{this}}}
  {{/each}}

  Determine which links are valid and accessible and which are invalid.

  Return two arrays of links, \"verifiedLinks\" and \"invalidLinks\". The \"verifiedLinks\" array should contain only the valid and accessible links. The \"invalidLinks\" array should contain the links that are not valid or accessible.
  Do not return any explanation, only the JSON output.
  `,
});

const verifyCertificateLinksFlow = ai.defineFlow(
  {
    name: 'verifyCertificateLinksFlow',
    inputSchema: VerifyCertificateLinksInputSchema,
    outputSchema: VerifyCertificateLinksOutputSchema,
  },
  async input => {
    const {output} = await verifyLinksPrompt(input);
    return output!;
  }
);
