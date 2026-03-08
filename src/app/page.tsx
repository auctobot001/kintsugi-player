'use client';

import dynamic from 'next/dynamic';

const KintsugiPlayer = dynamic(() => import('./KintsugiPlayer'), { ssr: false });

export default function Page() {
  return <KintsugiPlayer />;
}
