'use server';
/**
 * @fileOverview A flow to generate a personalized certificate by adding a name to a template image.
 *
 * - generateCertificate - A function that handles the certificate generation process.
 */

import { ai } from '@/ai/genkit';
import { GenerateCertificateInputSchema, GenerateCertificateOutputSchema, type GenerateCertificateInput, type GenerateCertificateOutput } from '@/components/app/recipient-table';
import { z } from 'zod';

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
