import { NextResponse } from 'next/server';
import { LIBRARY } from '@/lib/library';

/** GET /api/library — full library with all metadata */
export async function GET() {
  const library = LIBRARY.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    description: t.description,
    stems: t.stems.map((s) => ({ name: s.name, path: s.path })),
    coverPath: t.coverPath,
    ipfsCid: t.ipfsCid,
    ipfsImage: t.ipfsImage,
    collection: t.collection,
    royalty: t.royalty,
    premium: t.premium ?? false,
    x402Price: t.x402Price ?? null,
    license: {
      type: 'CC-BY-NC-SA-4.0',
      royaltyPercent: t.royalty,
      onChainEnforced: true,
    },
  }));

  return NextResponse.json({
    name: 'Kintsugi Player',
    version: '0.1.0',
    totalTracks: library.length,
    library,
  });
}
