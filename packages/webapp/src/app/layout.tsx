import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/providers/Providers';

export const metadata: Metadata = {
  title: 'stxact - Web3 Payment Receipts',
  description: 'Cryptographic payment receipts and dispute resolution on the Stacks blockchain',
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    shortcut: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
