'use client';

import { useDoc, useMemoFirebase, initializeFirebase } from '@/firebase';
import { doc, Firestore } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, use } from 'react';

type Recipient = {
  id: string;
  fullName?: string;
  'Full Name'?: string; // Add fallback for old data
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
  const resolvedParams = use(params);
  const [firestore, setFirestore] = useState<Firestore | null>(null);

  useEffect(() => {
    // Initialize Firebase on the client to get a firestore instance
    // This doesn't require a logged-in user.
    const { firestore: fs } = initializeFirebase();
    setFirestore(fs);
  }, []);

  const templateImage = PlaceHolderImages.find(img => img.id === 'certificate-template');

  const recipientRef = useMemoFirebase(() => {
    if (!firestore || !resolvedParams.id) return null;
    return doc(firestore, 'recipients', resolvedParams.id);
  }, [firestore, resolvedParams.id]);

  const { data: recipient, isLoading } = useDoc<Recipient>(recipientRef);

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
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-center" style={{ width: '80%', top: '52%' }}>
              <h1
                className="font-headline text-lg font-bold text-black md:text-2xl"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
              >
                {recipientName}
              </h1>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-gray-500">
        Congratulations, {recipientName}!
      </p>
    </div>
  );
}
