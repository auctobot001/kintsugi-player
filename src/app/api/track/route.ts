import { NextResponse } from 'next/server';
import { LIBRARY } from '@/lib/library';

/** GET /api/track — returns all tracks with metadata */
export async function GET() {
  const tracks = LIBRARY.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    description: t.description,
    stemCount: t.stems.length,
    coverPath: t.coverPath,
    ipfsCid: t.ipfsCid,
    collection: t.collection,
    royalty: t.royalty,
    premium: t.premium ?? false,
    x402Price: t.x402Price ?? null,
  }));

  return NextResponse.json({ tracks });
}
