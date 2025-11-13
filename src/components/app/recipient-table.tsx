"use client";

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Send, Loader2, CheckCircle, XCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { verifyCertificateLinks } from '@/ai/flows/verify-certificate-links';
import { generateCertificate as generateCertificateFlow, type GenerateCertificateInput, type GenerateCertificateOutput } from '@/ai/flows/generate-certificate';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, where, query, writeBatch } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type RecipientStatus = 'Pending' | 'Generating' | 'Generated' | 'Verifying' | 'Sending' | 'Sent' | 'Failed';

type Recipient = {
  id: string;
  'Full Name': string;
  'Age': number;
  'Blood Group': string;
  'Gender': string;
  'Job': string;
  'Area in Kuwait': string;
  'Whatsapp Number': string;
  'Email address': string;
  'Registered At': string;
  'Checked In At': string;
  status: RecipientStatus;
  downloadLink?: string;
  userId: string;
};

const StatusBadge = ({ status }: { status: RecipientStatus }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let className = 'flex items-center w-fit';
  let icon: React.ReactNode = null;

  switch (status) {
    case 'Pending':
      variant = 'outline';
      icon = <AlertTriangle className="mr-1 h-3 w-3" />;
      break;
    case 'Generating':
      variant = 'secondary';
      icon = <Loader2 className="mr-1 h-3 w-3 animate-spin" />;
      break;

    case 'Generated':
      variant = 'default';
      className += ' bg-accent/20 text-accent-foreground border-accent/20 hover:bg-accent/30';
      icon = <CheckCircle className="mr-1 h-3 w-3 text-accent" />;
      break;

    case 'Verifying':
    case 'Sending':
      variant = 'secondary';
      icon = <Loader2 className="mr-1 h-3 w-3 animate-spin" />;
      break;

    case 'Sent':
      variant = 'default';
      className += ' bg-chart-2/20 text-chart-2 border-chart-2/20 hover:bg-chart-2/30';
      icon = <CheckCircle className="mr-1 h-3 w-3 text-chart-2" />;
      break;
      
    case 'Failed':
      variant = 'destructive';
      icon = <XCircle className="mr-1 h-3 w-3" />;
      break;
  }

  return (
    <Badge variant={variant} className={cn(className)}>
      {icon}
      <span>{status}</span>
    </Badge>
  );
};

export function RecipientTable() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const templateImage = PlaceHolderImages.find(img => img.id === 'certificate-template');

  const recipientsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'recipients'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: recipients, isLoading: isRecipientsLoading } = useCollection<Recipient>(recipientsQuery);

  const updateRecipientStatus = (id: string, status: RecipientStatus, downloadLink?: string) => {
    if (!firestore) return;
    const recipientRef = doc(firestore, 'recipients', id);
    const dataToUpdate: Partial<Recipient> = { status };
    if (downloadLink) {
      dataToUpdate.downloadLink = downloadLink;
    }
    updateDocumentNonBlocking(recipientRef, dataToUpdate);
  };
  
  const generateCertificate = async (recipient: Recipient) => {
    updateRecipientStatus(recipient.id, 'Generating');
    try {
      if (!templateImage) {
        throw new Error('Certificate template not found.');
      }
      
      toast({
        title: "Generating Certificate...",
        description: `Adding "${recipient['Full Name']}" to the certificate. This may take a moment.`,
      });
      
      const input: GenerateCertificateInput = {
        name: recipient['Full Name'],
        templateUrl: templateImage.imageUrl,
      };

      const result: GenerateCertificateOutput = await generateCertificateFlow(input);

      updateRecipientStatus(recipient.id, 'Generated', result.certificateUrl);

      toast({
          title: "Certificate Generated",
          description: `Certificate for ${recipient['Full Name']} is ready.`,
      });
    } catch (error) {
        console.error("Certificate generation failed:", error);
        updateRecipientStatus(recipient.id, 'Failed');
        let description = "An unknown error occurred during certificate generation.";
        if (error instanceof Error) {
            if (error.message.includes("429")) {
                description = "You have exceeded the API quota. Please check your plan and usage.";
            } else {
                description = error.message;
            }
        }
        toast({
            variant: "destructive",
            title: "Generation Failed",
            description: description,
        });
    }
  };

  const handleSend = async (recipient: Recipient) => {
    if (!recipient.downloadLink) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No download link available for this recipient. Please generate the certificate first.",
        });
        return;
    }

    updateRecipientStatus(recipient.id, 'Verifying');

    try {
        if (!recipient.downloadLink.startsWith('data:image')) {
            const result = await verifyCertificateLinks({ downloadLinks: [recipient.downloadLink] });
    
            if (result.invalidLinks.length > 0) {
                updateRecipientStatus(recipient.id, 'Failed');
                toast({
                    variant: "destructive",
                    title: "Verification Failed",
                    description: `The link for ${recipient['Full Name']} is invalid.`,
                });
                return;
            }
        }

        updateRecipientStatus(recipient.id, 'Sending');
        
        const message = encodeURIComponent(`Dear ${recipient['Full Name']},
Congratulations! You have successfully completed the Basic Life Support training in association with KnowTech 3.0.
Here is your Participation Certificate recognizing your achievement.
To view and download your certificate, please click the following link:
${recipient.downloadLink}

Thank you for being a part of this initiative and enhancing your life-saving skills!`);
        
        const whatsappUrl = `https://wa.me/${recipient['Whatsapp Number']}?text=${message}`;
        
        window.open(whatsappUrl, '_blank');


        await new Promise(resolve => setTimeout(resolve, 1500)); 

        updateRecipientStatus(recipient.id, 'Sent');
        toast({
            title: "Ready to Send!",
            description: `A WhatsApp message for ${recipient['Full Name']} is ready.`,
        });

    } catch (error) {
        if (error instanceof Error) {
            updateRecipientStatus(recipient.id, 'Failed');
            toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: error.message || "Could not send the certificate. Please try again.",
            });
        }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to upload recipients.",
      });
      return;
    }

    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<any>(worksheet);
          
          const newRecipients: Omit<Recipient, 'id'>[] = json.map((row: any) => ({
            'Full Name': row['Full Name'] || 'N/A',
            'Age': row['Age'] || 0,
            'Blood Group': row['Blood Group'] || 'N/A',
            'Gender': row['Gender'] || 'N/A',
            'Job': row['Job'] || 'N/A',
            'Area in Kuwait': row['Area in Kuwait'] || 'N/A',
            'Whatsapp Number': String(row['Whatsapp Number'] || ''),
            'Email address': row['Email address'] || 'N/A',
            'Registered At': row['Registered At'] || 'N/A',
            'Checked In At': row['Checked In At'] || 'N/A',
            status: 'Pending' as RecipientStatus,
            userId: user.uid,
          }));

          const recipientsCollection = collection(firestore, 'recipients');
          const batch = writeBatch(firestore);
          newRecipients.forEach(recipient => {
            const docRef = doc(recipientsCollection);
            batch.set(docRef, recipient);
          });
          await batch.commit();

          toast({
              title: "File Processed",
              description: `${file.name} has been successfully processed and saved.`,
          });
        } catch (error) {
          console.error("Error processing file:", error);
          toast({
            variant: "destructive",
            title: "File Processing Error",
            description: "There was an error reading or saving the file. Please ensure it's a valid Excel or CSV file.",
          });
        }
      };
      reader.onerror = (error) => {
          console.error("FileReader error:", error);
          toast({
            variant: "destructive",
            title: "File Read Error",
            description: "Could not read the selected file.",
          });
      };
      reader.readAsArrayBuffer(file);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };


  const getButtonForStatus = (recipient: Recipient) => {
    switch (recipient.status) {
        case 'Generated':
            return <Button size="sm" onClick={() => handleSend(recipient)}><Send className="mr-2 h-4 w-4" /> Send</Button>;
        case 'Verifying':
        case 'Sending':
            return <Button size="sm" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {recipient.status}...</Button>;
        case 'Sent':
            return <Button size="sm" variant="outline" disabled><CheckCircle className="mr-2 h-4 w-4 text-chart-2" /> Sent</Button>;
        case 'Failed':
             return <Button size="sm" variant="destructive" onClick={() => generateCertificate(recipient)}>Retry</Button>;
        case 'Pending':
            return <Button size="sm" onClick={() => generateCertificate(recipient)}><Sparkles className="mr-2 h-4 w-4" /> Generate</Button>;
        case 'Generating':
            return <Button size="sm" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</Button>;
        default:
            return <Button size="sm" disabled>Send</Button>;
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button asChild disabled={isUserLoading}>
                <label htmlFor="recipient-file-upload">
                    <Upload className="mr-2 h-4 w-4"/>
                    Upload Recipient List
                </label>
            </Button>
            <Input id="recipient-file-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
            <p className="text-sm text-muted-foreground">Upload an Excel or CSV file.</p>
        </div>
        <Card className="border shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>WhatsApp Number</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Area in Kuwait</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isRecipientsLoading || isUserLoading ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                            </TableCell>                        
                        </TableRow>
                    ) : recipients && recipients.length > 0 ? (
                        recipients.map(recipient => (
                        <TableRow key={recipient.id}>
                            <TableCell className="font-medium">{recipient['Full Name']}</TableCell>
                            <TableCell>{recipient['Whatsapp Number']}</TableCell>
                            <TableCell>{recipient['Email address']}</TableCell>
                            <TableCell>{recipient['Job']}</TableCell>
                            <TableCell>{recipient['Area in Kuwait']}</TableCell>
                            <TableCell><StatusBadge status={recipient.status} /></TableCell>
                            <TableCell className="text-right">{getButtonForStatus(recipient)}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No recipients found. Upload a file to get started.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    </div>
  );
}
