/** Shared track library — single source of truth for client + API routes */

import { ZORA_LIBRARY } from '../data/zora-library';

export interface StemDef {
  name: string;
  path: string;
}

export interface TrackEntry {
  id: string;
  title: string;
  artist: string;
  album: string;
  description: string;
  stems: StemDef[];
  coverPath: string;
  ipfsCid: string;
  ipfsImage: string;
  collection: string;
  royalty: number;
  premium?: boolean;
  x402Price?: string;
  videoUrl?: string;   // CDN URL for music video (MP4 or HLS .m3u8)
  mediaType: 'stems' | 'video';
}

const STEM_TRACKS: TrackEntry[] = [
  {
    id: 'suddenly',
    title: 'Suddenly (Remix)',
    artist: 'Bootie Brown ft. Amy Correa Bell',
    album: 'UltraHipFunkWave',
    description:
      'First collection ever minted by Bootie Brown. Featured in PROCESS Docuseries by Pattern Integrity Films.',
    stems: [
      { name: 'Vocal', path: '/audio/suddenly/vocal.mp3' },
      { name: 'Rap', path: '/audio/suddenly/rap.mp3' },
      { name: 'Drums', path: '/audio/suddenly/drums.mp3' },
      { name: 'Bass', path: '/audio/suddenly/bass.mp3' },
      { name: 'Synth', path: '/audio/suddenly/synth.mp3' },
      { name: 'Perc & FX', path: '/audio/suddenly/perc-n-fx.mp3' },
    ],
    coverPath: '/audio/suddenly/cover.jpeg',
    ipfsCid: 'QmbjqQauZxxA2Q9F5e6bAoAZf85HZxyzUyvRs17hydPZXV',
    ipfsImage: 'ipfs://QmbjqQauZxxA2Q9F5e6bAoAZf85HZxyzUyvRs17hydPZXV/cover.jpeg',
    collection: 'https://nftinfos.loopring.io/0x3f3624c5967059a1033888f2f8ff57bd4b18704f',
    royalty: 10,
    mediaType: 'stems',
  },
  {
    id: 'get-it-right',
    title: 'Get It Right',
    artist: 'Bootie Brown prod. Kurser',
    album: 'UltraHipFunkWave',
    description:
      'BB goes back to the Boom Bap. Produced by Kurser out of Paris. 2 Grammy nominations for Gorillaz contributions.',
    stems: [
      { name: 'Vocals', path: '/audio/get-it-right/vocals.mp3' },
      { name: 'Drum', path: '/audio/get-it-right/drum.mp3' },
      { name: 'Bass', path: '/audio/get-it-right/bass.mp3' },
      { name: 'Synths', path: '/audio/get-it-right/synths.mp3' },
    ],
    coverPath: '/audio/get-it-right/cover.png',
    ipfsCid: 'QmSzbxunHatTJ8ht3T4A45rvi6tMSYKqJqctwFH2L2GgpE',
    ipfsImage: 'ipfs://QmSzbxunHatTJ8ht3T4A45rvi6tMSYKqJqctwFH2L2GgpE/cover.png',
    collection: 'https://nftinfos.loopring.io/0xd0351558182f1165aa956739c4502895e85ef4ba',
    royalty: 10,
    mediaType: 'stems',
  },
  {
    id: 'satisfied',
    title: 'Satisfied',
    artist: 'Bootie Brown & Kurser',
    album: 'Chapter 1',
    description:
      'Questions the passage of time and superficial purchases. Released via Chapter 1. Featured in PROCESS Docuseries.',
    stems: [
      { name: 'Vocal', path: '/audio/satisfied/vocal.mp3' },
      { name: 'Drums', path: '/audio/satisfied/drums.mp3' },
      { name: 'Bass', path: '/audio/satisfied/bass.mp3' },
      { name: 'Synths', path: '/audio/satisfied/synths.mp3' },
      { name: 'Hooks & FX', path: '/audio/satisfied/hooks-n-fx.mp3' },
    ],
    coverPath: '/audio/satisfied/cover.png',
    ipfsCid: 'QmcVS4UvMXeH453F2A1U7KY5D9D1TSQiw9PbCAhRN8wmgE',
    ipfsImage: 'ipfs://QmcVS4UvMXeH453F2A1U7KY5D9D1TSQiw9PbCAhRN8wmgE/cover.png',
    collection: 'https://nftinfos.loopring.io/0xe692526e868fab72f85f48dd58b720eb9245e121',
    royalty: 10,
    premium: true,
    x402Price: '0.50',
    mediaType: 'stems',
  },
];

export const LIBRARY: TrackEntry[] = [...STEM_TRACKS, ...ZORA_LIBRARY];

export function getTrackById(id: string): TrackEntry | undefined {
  return LIBRARY.find((t) => t.id === id);
}
