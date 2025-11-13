'use server';
/**
 * @fileOverview A flow to generate a personalized certificate by adding a name to a template image.
 *
 * - generateCertificate - A function that handles the certificate generation process.
 * - GenerateCertificateInput - The input type for the certificate generation flow.
 * - GenerateCertificateOutput - The output type for the certificate generation flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateCertificateInputSchema = z.object({
  name: z.string().describe('The name to be written on the certificate.'),
  templateUrl: z.string().url().describe('The URL of the certificate template image.'),
});
export type GenerateCertificateInput = z.infer<typeof GenerateCertificateInputSchema>;

const GenerateCertificateOutputSchema = z.object({
  certificateUrl: z.string().describe('The data URI of the generated certificate image.'),
});
export type GenerateCertificateOutput = z.infer<typeof GenerateCertificateOutputSchema>;


export async function generateCertificate(input: GenerateCertificateInput): Promise<GenerateCertificateOutput> {
  return generateCertificateFlow(input);
}

const generateCertificateFlow = ai.defineFlow(
  {
    name: 'generateCertificateFlow',
    inputSchema: GenerateCertificateInputSchema,
    outputSchema: GenerateCertificateOutputSchema,
  },
  async ({ name, templateUrl }) => {
    const { media, text } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image-preview',
        prompt: [
            { media: { url: templateUrl } },
            { text: `Write the name "${name}" on this certificate in the center, in an elegant, bold, calligraphic font. Do not change anything else on the certificate.` },
        ],
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media?.url) {
      throw new Error(`Image generation failed. Model response: ${text}`);
    }

    return { certificateUrl: media.url };
  }
);
