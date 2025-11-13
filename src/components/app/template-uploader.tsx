'use client';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';

export function TemplateUploader() {
  const templateImage = PlaceHolderImages.find(img => img.id === 'certificate-template');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Certificate Template</CardTitle>
        <CardDescription>Upload and manage your certificate template.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {templateImage && (
          <div className="relative aspect-[1.414/1] w-full overflow-hidden rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
            <Image
              src={templateImage.imageUrl}
              alt={templateImage.description}
              width={800}
              height={566}
              className="object-contain p-2"
              data-ai-hint={templateImage.imageHint}
            />
          </div>
        )}
        <div className="grid gap-2 text-center">
            <Button asChild variant="outline">
                <label htmlFor="template-file-upload">
                    <Upload className="mr-2 h-4 w-4"/>
                    Upload New Template
                </label>
            </Button>
            <Input id="template-file-upload" type="file" accept=".pdf,.png" className="hidden" />
            <p className="text-xs text-muted-foreground">
                Supported formats: PDF, PNG.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
