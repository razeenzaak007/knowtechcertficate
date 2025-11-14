'use client';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2 } from 'lucide-react';

type Recipient = {
  id: string;
  fullName: string;
  status: string;
  downloadLink?: string;
  userId: string;
};

export default function CertificatePage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const templateImage = PlaceHolderImages.find(img => img.id === 'certificate-template');

  const recipientRef = useMemoFirebase(() => {
    if (!firestore || !params.id) return null;
    return doc(firestore, 'recipients', params.id);
  }, [firestore, params.id]);

  const { data: recipient, isLoading } = useDoc<Recipient>(recipientRef);

  if (isLoading || !templateImage) {
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

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 sm:p-8">
      <Card className="w-full max-w-4xl overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          <div className="relative aspect-[1.414/1] w-full">
            <Image
              src={templateImage.imageUrl}
              alt="Certificate Background"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <h1
                className="font-headline text-4xl font-bold text-[#1A237E] md:text-6xl"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
              >
                {recipient.fullName}
              </h1>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-gray-500">
        Congratulations, {recipient.fullName}!
      </p>
    </div>
  );
}
