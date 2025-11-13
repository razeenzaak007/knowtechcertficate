'use server';
/**
 * @fileOverview A flow to generate a personalized certificate.
 *
 * - generateCertificate - A function that takes a certificate template and a name and returns a personalized certificate.
 * - GenerateCertificateInput - The input type for the generateCertificate function.
 * - GenerateCertificateOutput - The return type for the generateCertificate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCertificateInputSchema = z.object({
  certificateTemplateUrl: z.string().url().describe('The URL of the certificate template image.'),
  recipientName: z.string().describe('The name of the recipient to be added to the certificate.'),
});
export type GenerateCertificateInput = z.infer<typeof GenerateCertificateInputSchema>;

const GenerateCertificateOutputSchema = z.object({
  certificateUrl: z.string().url().describe('The URL of the generated certificate image with the name on it.'),
});
export type GenerateCertificateOutput = z.infer<typeof GenerateCertificateOutputSchema>;

export async function generateCertificate(input: GenerateCertificateInput): Promise<GenerateCertificateOutput> {
  return generateCertificateFlow(input);
}

const certificatePrompt = ai.definePrompt({
  name: 'certificatePrompt',
  input: {schema: GenerateCertificateInputSchema},
  // The output is now defined by the responseModalities, not a Zod schema.
  prompt: `You are an expert graphic designer. Your task is to take a certificate template image and a recipient's name, and generate a new certificate with the name elegantly placed on it.

  - The recipient's name is: {{{recipientName}}}
  - The certificate template is at this URL: {{media url=certificateTemplateUrl}}
  
  Place the name "{{{recipientName}}}" prominently in the center of the certificate, where a name would typically go. Use a font style that matches the certificate's design.
  
  Return ONLY the generated image. Do not return any text or JSON.`,
  config: {
    // This tells the model to output an image directly.
    responseModalities: ['IMAGE'],
  },
});

const generateCertificateFlow = ai.defineFlow(
  {
    name: 'generateCertificateFlow',
    inputSchema: GenerateCertificateInputSchema,
    outputSchema: GenerateCertificateOutputSchema,
  },
  async input => {
    try {
      // The 'media' object will contain the generated image data.
      const {media} = await certificatePrompt(input);

      // The URL of the generated image will be in media.url.
      if (media?.url) {
        return {certificateUrl: media.url};
      }

      // If media.url is not present, the image generation failed.
      throw new Error('Image generation failed to produce a valid URL.');
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      // Check for quota-related errors
      if (error.message && (error.message.includes('429') || error.message.toLowerCase().includes('quota'))) {
        throw new Error(
          'Certificate generation failed due to high demand (Quota Exceeded). Please try again later.'
        );
      }
      // Provide a more specific fallback error.
      throw new Error(error.message || 'An unexpected error occurred during certificate generation.');
    }
  }
);
