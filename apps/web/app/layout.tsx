import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Mercek — Ham veri, uzman gözü',
  description:
    'Sektör-farkında AI analist. Ham operasyon verisini uzman gözüyle okuyan analiz sistemi.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
