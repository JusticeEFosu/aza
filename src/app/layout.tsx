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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
