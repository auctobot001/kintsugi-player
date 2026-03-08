export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://kintsugi.film3.app';

  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER || '',
      payload: process.env.FARCASTER_PAYLOAD || '',
      signature: process.env.FARCASTER_SIGNATURE || '',
    },
    frame: {
      version: '1',
      name: 'Kintsugi Player',
      homeUrl: URL,
      iconUrl: `${URL}/icon.png`,
      imageUrl: `${URL}/og-image.png`,
      buttonTitle: 'Launch Kintsugi Player',
      splashBackgroundColor: '#1a1a2e',
      webhookUrl: `${URL}/api/webhook`,
    },
  });
}
