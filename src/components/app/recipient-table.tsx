"use client";

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Send, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { verifyCertificateLinks } from '@/ai/flows/verify-certificate-links';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';

type RecipientStatus = 'Pending' | 'Generating' | 'Generated' | 'Verifying' | 'Sending' | 'Sent' | 'Failed';

type Recipient = {
  id: number;
  fullName: string;
  age: number;
  bloodGroup: string;
  gender: string;
  job: string;
  areaInKuwait: string;
  whatsappNumber: string;
  emailAddress: string;
  registeredAt: string;
  checkedInAt: string;
  status: RecipientStatus;
  downloadLink?: string;
};

const initialRecipients: Recipient[] = [];

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
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
  const { toast } = useToast();

  const updateRecipientStatus = (id: number, status: RecipientStatus) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleSend = async (recipient: Recipient) => {
    if (!recipient.downloadLink) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No download link available for this recipient.",
        });
        return;
    }

    updateRecipientStatus(recipient.id, 'Verifying');

    try {
        const result = await verifyCertificateLinks({ downloadLinks: [recipient.downloadLink] });

        if (result.invalidLinks.length > 0) {
            updateRecipientStatus(recipient.id, 'Failed');
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: `The link for ${recipient.fullName} is invalid.`,
            });
            return;
        }

        updateRecipientStatus(recipient.id, 'Sending');

        await new Promise(resolve => setTimeout(resolve, 1500)); 

        updateRecipientStatus(recipient.id, 'Sent');
        toast({
            title: "Sent!",
            description: `Certificate sent to ${recipient.fullName}.`,
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
    const file = event.target.files?.[0];
    if (file) {
        toast({
            title: "File Uploaded",
            description: `${file.name} is being processed.`,
        });

        // This is a mock implementation. In a real app, you'd parse the file.
        // I'll create mock data that includes the new fields.
        const newRecipients: Recipient[] = [
            { id: 1, fullName: 'John Doe', age: 30, bloodGroup: 'O+', gender: 'Male', job: 'Engineer', areaInKuwait: 'Kuwait City', whatsappNumber: '+11111111111', emailAddress: 'john.doe@example.com', registeredAt: '2023-10-26', checkedInAt: '2023-10-27', status: 'Generating' },
            { id: 2, fullName: 'Jane Smith', age: 28, bloodGroup: 'A-', gender: 'Female', job: 'Designer', areaInKuwait: 'Salmiya', whatsappNumber: '+22222222222', emailAddress: 'jane.smith@example.com', registeredAt: '2023-10-26', checkedInAt: '2023-10-27', status: 'Generating' },
        ];

        setRecipients(newRecipients);

        setTimeout(() => {
            setRecipients(prev => prev.map((r, i) => ({
                ...r, 
                status: i === 0 ? 'Generated' : 'Failed', // Mock success and failure
                downloadLink: i === 0 ? 'https://firebasestorage.googleapis.com/v0/b/genkit-llm-tools.appspot.com/o/cert.pdf?alt=media' : undefined
            })));
            toast({
                title: "Processing Complete",
                description: "Certificates have been generated.",
            });
        }, 3000);
    }
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
             return <Button size="sm" variant="destructive" onClick={() => handleSend(recipient)}>Retry</Button>;
        case 'Pending':
        case 'Generating':
        default:
            return <Button size="sm" disabled>Send</Button>;
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button asChild>
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
                    {recipients.length > 0 ? (
                        recipients.map(recipient => (
                        <TableRow key={recipient.id}>
                            <TableCell className="font-medium">{recipient.fullName}</TableCell>
                            <TableCell>{recipient.whatsappNumber}</TableCell>
                            <TableCell>{recipient.emailAddress}</TableCell>
                            <TableCell>{recipient.job}</TableCell>
                            <TableCell>{recipient.areaInKuwait}</TableCell>
                            <TableCell><StatusBadge status={recipient.status} /></TableCell>
                            <TableCell className="text-right">{getButtonForStatus(recipient)}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                Upload a file to see your recipients.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    </div>
  );
}
