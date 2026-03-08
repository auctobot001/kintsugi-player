import { NextRequest, NextResponse } from 'next/server';
import { getTrackById } from '@/lib/library';

const PAYMENT_RECIPIENT = '0x697aAd779C93bDF0F33AC041085807e4BE162200';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const FACILITATOR_URL = 'https://x402.org/facilitator';

/** GET /api/track/[id] — returns track data, or 402 if premium */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const track = getTrackById(id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  // Non-premium tracks are free
  if (!track.premium) {
    return NextResponse.json({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      description: track.description,
      stems: track.stems,
      coverPath: track.coverPath,
      ipfsCid: track.ipfsCid,
      collection: track.collection,
      royalty: track.royalty,
    });
  }

  // Premium track — check for x402 payment header
  const paymentHeader = _req.headers.get('x-402-payment');
  if (paymentHeader) {
    // Payment provided — verify with facilitator
    try {
      const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment: paymentHeader,
          payTo: PAYMENT_RECIPIENT,
          amount: track.x402Price,
          network: 'eip155:8453',
        }),
      });
      if (verifyRes.ok) {
        return NextResponse.json({
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          description: track.description,
          stems: track.stems,
          coverPath: track.coverPath,
          ipfsCid: track.ipfsCid,
          collection: track.collection,
          royalty: track.royalty,
        });
      }
    } catch {
      // Verification failed — fall through to 402
    }
  }

  // Return 402 Payment Required with x402 headers
  const priceUsdcUnits = Math.round(
    parseFloat(track.x402Price ?? '0.50') * 1e6,
  ).toString();

  const paymentRequirements = {
    x402Version: 1,
    scheme: 'exact',
    network: 'eip155:8453',
    payTo: PAYMENT_RECIPIENT,
    maxAmountRequired: priceUsdcUnits,
    asset: USDC_BASE,
    extra: {
      name: 'USDC',
      decimals: 6,
    },
    description: `Access premium stem track: ${track.title} by ${track.artist}`,
  };

  return NextResponse.json(
    {
      error: 'Payment Required',
      title: track.title,
      artist: track.artist,
      premium: true,
      price: `${track.x402Price} USDC`,
      paymentRequirements,
    },
    {
      status: 402,
      headers: {
        'X-Payment-Requirements': JSON.stringify(paymentRequirements),
      },
    },
  );
}
