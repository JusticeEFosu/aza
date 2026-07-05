import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAzaa — Support Nigerian Creators",
  description: "The platform where fans directly support Nigerian creators with monthly subscriptions. Pay in naira, support who you love.",
  keywords: ["Nigerian creators", "Patreon Nigeria", "support creators", "naira subscriptions"],
};

export const viewport: import("next").Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { GlobalAnnouncement } from '@/components/GlobalAnnouncement';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { cookies } from 'next/headers';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const hasReturnToken = cookieStore.has('impersonation_return_token');

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ImpersonationBanner hasReturnToken={hasReturnToken} />
        <GlobalAnnouncement />
        {children}
      </body>
    </html>
  );
}
