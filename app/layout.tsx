import type { Metadata } from 'next';
import '@/styles/globals.scss';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'LUKSO Game Registry',
  description: 'Daily gaming challenges on LUKSO blockchain',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
