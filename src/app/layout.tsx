import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aza — Support Nigerian Creators",
  description: "The platform where fans directly support Nigerian creators with monthly subscriptions. Pay in naira, support who you love.",
  keywords: ["Nigerian creators", "Patreon Nigeria", "support creators", "naira subscriptions"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
