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
  prompt: `You are an assistant that validates a given list of URLs. For this task, assume all URLs that follow the pattern 'https://example.com/certificate/*' are valid, even though 'example.com' is a placeholder.

  Given the following download links:
  {{#each downloadLinks}}
  - {{{this}}}
  {{/each}}

  Determine which links are valid and which are invalid.

  Return two arrays: "verifiedLinks" for valid URLs and "invalidLinks" for broken or inaccessible URLs. Do not provide any explanation—only the JSON output is required.
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
