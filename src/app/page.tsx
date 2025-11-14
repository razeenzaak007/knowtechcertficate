'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateUploader } from '@/components/app/template-uploader';
import { RecipientTable } from '@/components/app/recipient-table';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-4 md:gap-8">
        <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Manage Recipients</CardTitle>
                <CardDescription>
                  Upload your recipient list, generate certificates, and send them via WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecipientTable />
              </CardContent>
            </Card>
          </div>
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
            <TemplateUploader />
          </div>
        </div>
      </main>
    </div>
  );
}
