export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || 'https://kintsugi.film3.app';

  return Response.json({
    name: 'Kintsugi Player',
    description:
      'Decentralized stem player for film3. Mix, share, and own music stems on Base. Features multi-track stem mixing, EQ visualization, x402 premium access, and ERC-8004 content licensing.',
    url: URL,
    logo: `${URL}/icon.png`,
    version: '0.1.0',
    capabilities: [
      {
        name: 'play_tracks',
        description: 'Play and mix multi-stem audio tracks from on-chain music collections',
      },
      {
        name: 'access_stems',
        description: 'Access individual audio stems (vocal, drums, bass, synth, etc.) for remixing',
      },
      {
        name: 'license_info',
        description: 'Retrieve ERC-8004 structured licensing metadata for any track',
      },
      {
        name: 'premium_access',
        description: 'Access premium stems via x402 micropayment protocol (USDC on Base)',
      },
    ],
    endpoints: [
      {
        path: '/api/track',
        method: 'GET',
        description: 'List all available tracks with metadata',
      },
      {
        path: '/api/track/{id}',
        method: 'GET',
        description: 'Get track details and stems. Premium tracks return 402 with x402 payment requirements.',
      },
      {
        path: '/api/library',
        method: 'GET',
        description: 'Full library with all metadata, stems, and licensing info',
      },
      {
        path: '/api/license/{id}',
        method: 'GET',
        description: 'ERC-8004 structured licensing metadata for a specific track',
      },
      {
        path: '/api/webhook',
        method: 'POST',
        description: 'MiniKit webhook handler for frame lifecycle events',
      },
    ],
    protocols: {
      x402: {
        version: 1,
        network: 'eip155:8453',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        assetName: 'USDC',
        recipient: '0x697aAd779C93bDF0F33AC041085807e4BE162200',
      },
      erc8004: {
        version: '1.0',
        licenseType: 'CC-BY-NC-SA-4.0',
      },
    },
    chain: {
      name: 'Base',
      chainId: 8453,
      rpc: 'https://mainnet.base.org',
    },
  });
}
