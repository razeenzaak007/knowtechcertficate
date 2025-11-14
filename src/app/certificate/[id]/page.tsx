'use client';

import { useDoc, useMemoFirebase, initializeFirebase } from '@/firebase';
import { doc, Firestore } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, Download } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

type Recipient = {
  id: string;
  fullName: string;
  'Full Name'?: string;
  age: number;
  bloodGroup: string;
  gender: string;
  job: string;
  areaInKuwait: string;
  whatsappNumber: string;
  emailAddress: string;
  registeredAt: string;
  checkedInAt: string;
  status: string;
  downloadLink?: string;
};

export default function CertificatePage({ params }: { params: { id: string } }) {
  const [firestore, setFirestore] = useState<Firestore | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { firestore: fs } = initializeFirebase();
    setFirestore(fs);
  }, []);

  const templateImage = PlaceHolderImages.find(img => img.id === 'certificate-template');

  const recipientRef = useMemoFirebase(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'recipients', params.id);
  }, [firestore, params.id]);

  const { data: recipient, isLoading } = useDoc<Recipient>(recipientRef);

  const handleDownloadPdf = async () => {
    if (!templateImage || !recipient) return;

    setIsDownloading(true);
    try {
        const recipientName = recipient.fullName || recipient['Full Name'] || 'Recipient Name';
        const image = new window.Image();
        image.crossOrigin = 'Anonymous'; // Required for images from different domains
        image.src = templateImage.imageUrl;

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const aspectRatio = image.width / image.height;
            canvas.width = 1200; // Set a fixed width for high quality
            canvas.height = canvas.width / aspectRatio;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setIsDownloading(false);
                return;
            }

            // Draw the certificate background image
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            // Set text properties
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Adjust font size and position relative to canvas size
            const fontSize = canvas.width * 0.04; 
            ctx.font = `bold ${fontSize}px Literata, serif`;
            ctx.fillStyle = 'black';
            
            // Calculate position
            const x = canvas.width / 2;
            const y = canvas.height * 0.51;

            // Draw the recipient's name
            ctx.fillText(recipientName, x, y);

            // Create PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`Certificate-${recipientName}.pdf`);
            setIsDownloading(false);
        };

        image.onerror = () => {
            console.error("Error loading image for PDF generation.");
            setIsDownloading(false);
        }

    } catch (error) {
      console.error("Error generating PDF:", error);
      setIsDownloading(false);
    }
  };

  if (isLoading || !firestore || !templateImage) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Certificate...</p>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold text-destructive">Certificate Not Found</h1>
        <p className="mt-2 text-muted-foreground">The requested certificate does not exist or may have been removed.</p>
      </div>
    );
  }
  
  const recipientName = recipient.fullName || recipient['Full Name'] || 'Recipient Name';

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 sm:p-8">
        <div ref={certificateRef}>
            <Card className="w-full max-w-4xl overflow-hidden shadow-2xl">
                <CardContent className="p-0">
                <div className="relative aspect-[1.414/1] w-full">
                    {templateImage && (
                        <Image
                        src={templateImage.imageUrl}
                        alt="Certificate Background"
                        fill
                        className="object-cover"
                        />
                    )}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-center" style={{ width: '80%', top: '51%' }}>
                    <h1
                        className="font-headline text-lg font-bold text-black md:text-xl"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
                    >
                        {recipientName}
                    </h1>
                    </div>
                </div>
                </CardContent>
            </Card>
        </div>
       <Button onClick={handleDownloadPdf} disabled={isDownloading} className="my-4">
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isDownloading ? 'Downloading...' : 'Download PDF'}
      </Button>
      <p className="text-sm text-gray-500">
        Congratulations, {recipientName}!
      </p>
    </div>
  );
}
