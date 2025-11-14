"use client";

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Send, Loader2, CheckCircle, XCircle, AlertTriangle, Sparkles, Wand2, Trash2, MoreVertical, Mail } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type RecipientStatus = 'Pending' | 'Generating' | 'Generated' | 'Sending' | 'Sent' | 'Failed';

type Recipient = {
  id: string;
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
      description: `The link for ${recipient.fullName} is ready to be sent.`,
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
        const message = encodeURIComponent(`Dear ${recipient.fullName},

Congratulations! You can view and download your certificate by clicking the link below.
${recipient.downloadLink}

Thank you!`);

        const whatsappUrl = `https://wa.me/${recipient.whatsappNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');

        setTimeout(() => {
            updateRecipient(recipient.id, { status: 'Sent' });
            toast({
                title: "Ready to Send!",
                description: `A WhatsApp message for ${recipient.fullName} is ready.`,
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

  const handleSendEmail = (recipient: Recipient) => {
    if (!recipient.downloadLink) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No certificate link found. Please generate it first.",
      });
      return;
    }

    if (!recipient.emailAddress || recipient.emailAddress === 'N/A') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No email address found for this recipient.",
      });
      return;
    }

    updateRecipient(recipient.id, { status: 'Sending' });
    try {
      const subject = encodeURIComponent(`Your Certificate is Ready!`);
      const body = encodeURIComponent(`Dear ${recipient.fullName},

Congratulations! You can view and download your certificate by clicking the link below.
${recipient.downloadLink}

Thank you!`);

      const mailtoUrl = `mailto:${recipient.emailAddress}?subject=${subject}&body=${body}`;
      window.open(mailtoUrl, '_blank');

      setTimeout(() => {
        updateRecipient(recipient.id, { status: 'Sent' });
        toast({
          title: "Email Ready!",
          description: `An email for ${recipient.fullName} is ready to be sent.`,
        });
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        updateRecipient(recipient.id, { status: 'Failed' });
        toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: error.message || "Could not prepare the email.",
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
            fullName: row['Full Name'] || 'N/A',
            age: row['Age'] || 0,
            bloodGroup: row['Blood Group'] || 'N/A',
            gender: row['Gender'] || 'N/A',
            job: row['Job'] || 'N/A',
            areaInKuwait: row['Area in Kuwait'] || 'N/A',
            whatsappNumber: String(row['Whatsapp Number'] || ''),
            emailAddress: row['Email address'] || 'N/A',
            registeredAt: row['Registered At'] || 'N/A',
            checkedInAt: row['Checked In At'] || 'N/A',
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

  const getButtonForStatus = (recipient: Recipient, isMobile: boolean) => {
    const commonProps = {
      size: "sm" as const,
      className: "w-full sm:w-auto"
    };

    const generateButton = (
      <Button {...commonProps} onClick={() => handleGenerate(recipient)}>
        <Wand2 className="mr-2 h-4 w-4" /> Generate
      </Button>
    );

    const generateDropdownItem = (
      <DropdownMenuItem onClick={() => handleGenerate(recipient)}>
        <Wand2 className="mr-2 h-4 w-4" /> Generate
      </DropdownMenuItem>
    );
    
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {recipient.status === 'Pending' || recipient.status === 'Failed' ? (
              generateDropdownItem
            ) : recipient.status === 'Generated' || recipient.status === 'Sent' ? (
              <>
                <DropdownMenuItem onClick={() => handleSend(recipient)}>
                  <Send className="mr-2 h-4 w-4" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendEmail(recipient)}>
                  <Mail className="mr-2 h-4 w-4" /> Email
                </DropdownMenuItem>
                <DropdownMenuSeparator/>
                 <DropdownMenuItem onClick={() => handleGenerate(recipient)}>
                  <Wand2 className="mr-2 h-4 w-4" /> Re-Generate
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    switch (recipient.status) {
      case 'Pending':
      case 'Failed':
        return generateButton;
      case 'Generating':
        return <Button {...commonProps} disabled><Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Generating...</Button>;
      case 'Generated':
      case 'Sent':
         const buttonVariant = recipient.status === 'Sent' ? 'outline' : 'default';
         const buttonText = recipient.status === 'Sent' ? 'Re-send' : 'Send';
         return (
          <div className="flex gap-2 justify-end">
            <Button {...commonProps} variant={buttonVariant} onClick={() => handleSend(recipient)}>
              {recipient.status === 'Sent' ? <CheckCircle className="mr-2 h-4 w-4 text-chart-2" /> : <Send className="mr-2 h-4 w-4" />} 
              {buttonText} (WA)
            </Button>
            <Button {...commonProps} variant="secondary" onClick={() => handleSendEmail(recipient)}>
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
          </div>
        );
      case 'Sending':
        return <Button {...commonProps} disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</Button>;
      default:
        return <Button {...commonProps} disabled>Send</Button>;
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button asChild className='w-full sm:w-auto'>
                  <label htmlFor="recipient-file-upload">
                      <Upload className="mr-2 h-4 w-4"/>
                      Upload List
                  </label>
              </Button>
              <Input id="recipient-file-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
              <p className="hidden sm:block text-sm text-muted-foreground">Upload an Excel or CSV file.</p>
              <div className="ml-auto">
                <Button 
                  variant="destructive" 
                  onClick={() => setIsClearConfirmOpen(true)}
                  disabled={isRecipientsLoading || !recipients || recipients.length === 0 || isClearing}
                  className='w-full sm:w-auto'
                  size="sm"
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
                      <TableHead className="hidden md:table-cell">Contact</TableHead>
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
                              <TableCell className="font-medium">
                                <div className="truncate w-40 sm:w-auto">{recipient.fullName}</div>
                                <div className="text-muted-foreground text-sm md:hidden">{recipient.whatsappNumber}</div>
                                <div className="text-muted-foreground text-xs md:hidden truncate w-40">{recipient.emailAddress}</div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex flex-col gap-1">
                                  <span>{recipient.whatsappNumber}</span>
                                  <span className="text-muted-foreground text-xs">{recipient.emailAddress}</span>
                                </div>
                              </TableCell>
                              <TableCell><StatusBadge status={recipient.status} /></TableCell>
                              <TableCell className="text-right">{getButtonForStatus(recipient, false)}</TableCell>
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
