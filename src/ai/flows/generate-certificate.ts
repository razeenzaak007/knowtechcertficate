'use server';
/**
 * @fileOverview A flow to generate a personalized certificate.
 *
 * - generateCertificate - A function that takes a certificate template and a name and returns a personalized certificate.
 * - GenerateCertificateInput - The input type for the generateCertificate function.
 * - GenerateCertificateOutput - The return type for the generateCertificate function.
 */
// This file is no longer used and will be removed in a future step.
// We are keeping it for now to avoid breaking imports, but the logic
// has been moved to the client-side `recipient-table.tsx` component.
import {z} from 'zod';

export type GenerateCertificateInput = {
  certificateTemplateUrl: string;
  recipientName: string;
};

export type GenerateCertificateOutput = {
  certificateUrl: string;
};

export async function generateCertificate(input: GenerateCertificateInput): Promise<GenerateCertificateOutput> {
  // This is a dummy function.
  // The actual logic is now on the client-side.
  console.warn('generateCertificate server flow is being called, but is deprecated.');
  return { certificateUrl: '' };
}
