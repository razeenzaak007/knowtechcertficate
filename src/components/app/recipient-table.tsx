"use client";

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Send, Loader2, CheckCircle, XCircle, AlertTriangle, Sparkles, Wand2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, writeBatch, getDocs } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type RecipientStatus = 'Pending' | 'Generating' | 'Generated' | 'Sending' | 'Sent' | 'Failed';

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
        icon = <Sparkles className="mr-1 h-3 w-3 animate-pulse" />;
        break;
    case 'Generated':
        variant = 'default';
        className += ' bg-blue-500/20 text-blue-700 border-blue-500/20 hover:bg-blue-500/30';
        icon = <CheckCircle className="mr-1 h-3 w-3 text-blue-700" />;
        break;
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
  const firestore = useFirestore();
  const [isClearing, setIsClearing] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const recipientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recipients'));
  }, [firestore]);

  const { data: recipients, isLoading: isRecipientsLoading } = useCollection<Recipient>(recipientsQuery);

  const updateRecipient = (id: string, data: Partial<Recipient>) => {
    if (!firestore) return;
    const recipientRef = doc(firestore, 'recipients', id);
    updateDocumentNonBlocking(recipientRef, data);
  };
  
  const handleGenerate = (recipient: Recipient) => {
    if (!recipient.id) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Recipient ID is missing. Cannot create a link.",
        });
        return;
    }
    const certificateUrl = `${window.location.origin}/certificate/${recipient.id}`;
    updateRecipient(recipient.id, { status: 'Generated', downloadLink: certificateUrl });
    toast({
      title: 'Certificate Link Ready!',
      description: `The link for ${recipient['Full Name']} is ready to be sent.`,
    });
  };

  const handleSend = (recipient: Recipient) => {
    if (!recipient.downloadLink) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No certificate link found. Please generate it first.",
        });
        return;
    }
    updateRecipient(recipient.id, { status: 'Sending' });
    try {
        const message = encodeURIComponent(`Dear ${recipient['Full Name']},

Congratulations! You can view and download your certificate by clicking the link below.
${recipient.downloadLink}

Thank you!`);

        const whatsappUrl = `https://wa.me/${recipient['Whatsapp Number']}?text=${message}`;
        window.open(whatsappUrl, '_blank');

        setTimeout(() => {
            updateRecipient(recipient.id, { status: 'Sent' });
            toast({
                title: "Ready to Send!",
                description: `A WhatsApp message for ${recipient['Full Name']} is ready.`,
            });
        }, 1500);

    } catch (error) {
        if (error instanceof Error) {
            updateRecipient(recipient.id, { status: 'Failed' });
            toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: error.message || "Could not prepare the certificate message.",
            });
        }
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Database Error",
        description: "Firestore is not available.",
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
    event.target.value = '';
  };


  const getButtonForStatus = (recipient: Recipient) => {
    switch (recipient.status) {
      case 'Pending':
      case 'Failed':
        return <Button size="sm" onClick={() => handleGenerate(recipient)}><Wand2 className="mr-2 h-4 w-4" /> Generate</Button>;
      case 'Generating':
        return <Button size="sm" disabled><Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Generating...</Button>;
      case 'Generated':
        return <Button size="sm" onClick={() => handleSend(recipient)}><Send className="mr-2 h-4 w-4" /> Send</Button>;
      case 'Sending':
        return <Button size="sm" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</Button>;
      case 'Sent':
        return <Button size="sm" variant="outline" onClick={() => handleSend(recipient)}><CheckCircle className="mr-2 h-4 w-4 text-chart-2" /> Re-send</Button>;
      default:
        return <Button size="sm" disabled>Send</Button>;
    }
  }

  const handleClearAll = async () => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not clear data. Database not available.",
      });
      return;
    }
    setIsClearing(true);
    try {
      const q = query(collection(firestore, 'recipients'));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast({
        title: "Data Cleared",
        description: "All recipient data has been successfully removed.",
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred while clearing the data.",
      });
    } finally {
      setIsClearing(false);
      setIsClearConfirmOpen(false);
    }
  };

  return (
    <>
      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              recipient data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} disabled={isClearing}>
              {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <div className="ml-auto">
                <Button 
                  variant="destructive" 
                  onClick={() => setIsClearConfirmOpen(true)}
                  disabled={isRecipientsLoading || !recipients || recipients.length === 0 || isClearing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              </div>
          </div>
          <Card className="border shadow-sm">
              <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>WhatsApp Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {isRecipientsLoading ? (
                          <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                              </TableCell>                        
                          </TableRow>
                      ) : recipients && recipients.length > 0 ? (
                          recipients.map(recipient => (
                          <TableRow key={recipient.id}>
                              <TableCell className="font-medium">{recipient['Full Name']}</TableCell>
                              <TableCell>{recipient['Whatsapp Number']}</TableCell>
                              <TableCell><StatusBadge status={recipient.status} /></TableCell>
                              <TableCell className="text-right">{getButtonForStatus(recipient)}</TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                  No recipients found. Upload a file to get started.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </Card>
      </div>
    </>
  );
}
