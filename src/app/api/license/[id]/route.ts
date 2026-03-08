import { NextRequest, NextResponse } from 'next/server';
import { getTrackById } from '@/lib/library';

/**
 * GET /api/license/[id] — ERC-8004 structured licensing metadata
 *
 * Returns content licensing data following ERC-8004 format:
 * - Content identification (title, artist, IPFS hash)
 * - License terms (type, royalty percentage)
 * - On-chain provenance (collection address, NFT metadata)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const track = getTrackById(id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  // ERC-8004 Content Licensing Metadata
  const license = {
    // ERC-8004 standard fields
    schema: 'ERC-8004',
    version: '1.0',

    // Content identification
    content: {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      description: track.description,
      mediaType: 'audio/mpeg',
      stems: track.stems.length,
      ipfsHash: track.ipfsCid,
      ipfsImage: track.ipfsImage,
    },

    // License terms
    license: {
      type: 'CC-BY-NC-SA-4.0',
      name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0',
      permissions: ['play', 'remix', 'share'],
      restrictions: ['no-commercial-use-without-license', 'attribution-required', 'share-alike'],
      royaltyPercent: track.royalty,
      royaltyRecipient: '0x697aAd779C93bDF0F33AC041085807e4BE162200',
    },

    // On-chain provenance
    provenance: {
      chain: 'ethereum',
      collection: track.collection,
      standard: 'ERC-721',
      metadataURI: `ipfs://${track.ipfsCid}`,
    },

    // Access control
    access: {
      premium: track.premium ?? false,
      x402Price: track.x402Price ?? null,
      x402Asset: track.premium ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : null,
      x402Network: track.premium ? 'eip155:8453' : null,
    },
  };

  return NextResponse.json(license, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
