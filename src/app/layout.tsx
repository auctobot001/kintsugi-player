import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kintsugi Player',
  description: 'Y2K media player for film3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#1a1a2e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </body>
    </html>
  );
}
