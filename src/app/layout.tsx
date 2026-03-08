import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Kintsugi Player',
  description: 'Decentralized stem player for film3 — mix, share, and own music on Base',
  openGraph: {
    title: 'Kintsugi Player',
    description: 'Decentralized stem player for film3',
    url: 'https://kintsugi.film3.app',
    siteName: 'Kintsugi',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="69459de3d77c069a945be18f" />
      </head>
      <body style={{ margin: 0, background: '#1a1a2e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
