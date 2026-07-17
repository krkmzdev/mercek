import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const description =
  'Sektöre duyarlı AI analist. Ham operasyon verisini (Excel, CSV, PDF) uzman gözüyle okur; her sayı kaynak hücresine kadar izlenebilir.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mercek — Ham veri, uzman gözü',
    template: '%s — Mercek',
  },
  description,
  keywords: ['AI analist', 'veri analizi', 'KPI', 'benchmark', 'Gemini', 'Next.js'],
  openGraph: {
    title: 'Mercek — Sektöre duyarlı AI analist',
    description,
    url: siteUrl,
    siteName: 'Mercek',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercek — Sektöre duyarlı AI analist',
    description,
  },
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
