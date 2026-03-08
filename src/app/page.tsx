'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import './globals.css';

/* ── Types ── */
interface Stem {
  name: string;
  path: string;
  volume: number;
  muted: boolean;
  solo: boolean;
}

interface SongEntry {
  id: string;
  title: string;
  artist: string;
  album: string;
  description: string;
  stems: { name: string; path: string }[];
  coverPath: string;
  ipfsCid: string;
  ipfsImage: string;
  collection: string;
  royalty: number;
}

interface StemAudio {
  el: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

/* ── Song Library (IPFS provenance) ── */
const LIBRARY: SongEntry[] = [
  {
    id: 'suddenly',
    title: 'Suddenly (Remix)',
    artist: 'Bootie Brown ft. Amy Correa Bell',
    album: 'UltraHipFunkWave',
    description: 'First collection ever minted by Bootie Brown. Featured in PROCESS Docuseries by Pattern Integrity Films.',
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
  },
  {
    id: 'get-it-right',
    title: 'Get It Right',
    artist: 'Bootie Brown prod. Kurser',
    album: 'UltraHipFunkWave',
    description: 'BB goes back to the Boom Bap. Produced by Kurser out of Paris. 2 Grammy nominations for Gorillaz contributions.',
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
  },
  {
    id: 'satisfied',
    title: 'Satisfied',
    artist: 'Bootie Brown & Kurser',
    album: 'Chapter 1',
    description: 'Questions the passage of time and superficial purchases. Released via Chapter 1. Featured in PROCESS Docuseries.',
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
  },
];

/* ── Component ── */
export default function KintsugiPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const stemAudioRef = useRef<StemAudio[]>([]);

  const [currentSong, setCurrentSong] = useState<SongEntry | null>(null);
  const [stems, setStems] = useState<Stem[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(80);
  const [dragging, setDragging] = useState(false);
  const [eqVisible, setEqVisible] = useState(true);
  const [libVisible, setLibVisible] = useState(true);
  const [mixerVisible, setMixerVisible] = useState(true);
  const [view, setView] = useState<'library' | 'info'>('library');

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /* ── Audio context ── */
  const getCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    return ctx;
  }, []);

  /* ── Cleanup stems ── */
  const cleanupStems = useCallback(() => {
    stemAudioRef.current.forEach(sa => {
      sa.el.pause();
      sa.el.src = '';
      sa.source.disconnect();
      sa.gain.disconnect();
    });
    stemAudioRef.current = [];
  }, []);

  /* ── Load song ── */
  const loadSong = useCallback((song: SongEntry) => {
    cleanupStems();
    const ctx = getCtx();
    const analyser = analyserRef.current!;

    const newStems: Stem[] = song.stems.map(s => ({
      name: s.name,
      path: s.path,
      volume: 100,
      muted: false,
      solo: false,
    }));

    const stemAudios: StemAudio[] = song.stems.map(s => {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      el.src = s.path;
      const source = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = 1;
      source.connect(gain);
      gain.connect(analyser);
      return { el, source, gain };
    });

    stemAudioRef.current = stemAudios;
    setStems(newStems);
    setCurrentSong(song);
    setPlaying(false);
    setCurTime(0);

    // Get duration from first stem
    const firstEl = stemAudios[0]?.el;
    if (firstEl) {
      const onMeta = () => {
        setDuration(firstEl.duration);
        firstEl.removeEventListener('loadedmetadata', onMeta);
      };
      firstEl.addEventListener('loadedmetadata', onMeta);
    }
  }, [cleanupStems, getCtx]);

  /* ── Play/Pause all stems ── */
  const togglePlay = useCallback(() => {
    if (!currentSong) {
      if (LIBRARY.length > 0) loadSong(LIBRARY[0]);
      return;
    }
    const ctx = ctxRef.current;
    if (ctx?.state === 'suspended') ctx.resume();

    if (playing) {
      stemAudioRef.current.forEach(sa => sa.el.pause());
      setPlaying(false);
    } else {
      // Sync all stems to same time and play
      const t = stemAudioRef.current[0]?.el.currentTime ?? 0;
      stemAudioRef.current.forEach(sa => {
        sa.el.currentTime = t;
        sa.el.play();
      });
      setPlaying(true);
    }
  }, [currentSong, playing, loadSong]);

  /* ── Time update ── */
  useEffect(() => {
    if (!playing) return;
    const firstEl = stemAudioRef.current[0]?.el;
    if (!firstEl) return;
    const tick = () => { if (!dragging) setCurTime(firstEl.currentTime); };
    const onEnd = () => {
      setPlaying(false);
      setCurTime(0);
      stemAudioRef.current.forEach(sa => { sa.el.currentTime = 0; });
    };
    firstEl.addEventListener('timeupdate', tick);
    firstEl.addEventListener('ended', onEnd);
    return () => {
      firstEl.removeEventListener('timeupdate', tick);
      firstEl.removeEventListener('ended', onEnd);
    };
  }, [playing, dragging]);

  /* ── Visualizer ── */
  const drawViz = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barW = (canvas.width / 20) - 1;
      for (let i = 0; i < 20; i++) {
        const idx = Math.floor(i * bufLen / 20);
        const v = data[idx] / 255;
        const h = v * canvas.height;
        const grad = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
        grad.addColorStop(0, '#d4af37');
        grad.addColorStop(0.5, '#00ff88');
        grad.addColorStop(1, '#005533');
        ctx.fillStyle = grad;
        ctx.fillRect(i * (barW + 1), canvas.height - h, barW, h);
      }
    };
    draw();
  }, []);

  useEffect(() => {
    if (playing) drawViz();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, drawViz]);

  /* ── Stem volume/mute/solo ── */
  const updateStemGain = useCallback((newStems: Stem[]) => {
    const hasSolo = newStems.some(s => s.solo);
    newStems.forEach((s, i) => {
      const sa = stemAudioRef.current[i];
      if (!sa) return;
      const shouldPlay = hasSolo ? s.solo : !s.muted;
      sa.gain.gain.value = shouldPlay ? (s.volume / 100) * (masterVolume / 100) : 0;
    });
  }, [masterVolume]);

  const setStemVolume = (idx: number, vol: number) => {
    setStems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], volume: vol };
      updateStemGain(next);
      return next;
    });
  };

  const toggleStemMute = (idx: number) => {
    setStems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], muted: !next[idx].muted };
      updateStemGain(next);
      return next;
    });
  };

  const toggleStemSolo = (idx: number) => {
    setStems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], solo: !next[idx].solo };
      updateStemGain(next);
      return next;
    });
  };

  // Keep master volume in sync
  useEffect(() => {
    updateStemGain(stems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterVolume]);

  /* ── Seek ── */
  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (duration) {
      const t = pct * duration;
      stemAudioRef.current.forEach(sa => { sa.el.currentTime = t; });
      setCurTime(t);
    }
  };

  const setVol = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setMasterVolume(Math.round(pct * 100));
  };

  /* ── Play next/prev song ── */
  const playSongByOffset = (offset: number) => {
    const idx = LIBRARY.findIndex(s => s.id === currentSong?.id);
    const next = idx + offset;
    if (next >= 0 && next < LIBRARY.length) {
      loadSong(LIBRARY[next]);
      // Auto-play after a tick to let audio elements initialize
      setTimeout(() => {
        const ctx = ctxRef.current;
        if (ctx?.state === 'suspended') ctx.resume();
        stemAudioRef.current.forEach(sa => sa.el.play());
        setPlaying(true);
      }, 100);
    }
  };

  /* ── Styles ── */
  const bevel = (inset = false) => ({
    borderTop: `1px solid ${inset ? 'var(--win-border-dark)' : 'var(--win-border-light)'}`,
    borderLeft: `1px solid ${inset ? 'var(--win-border-dark)' : 'var(--win-border-light)'}`,
    borderBottom: `1px solid ${inset ? 'var(--win-border-light)' : 'var(--win-border-dark)'}`,
    borderRight: `1px solid ${inset ? 'var(--win-border-light)' : 'var(--win-border-dark)'}`,
  });

  const btnStyle: React.CSSProperties = {
    ...bevel(),
    background: 'var(--button-face)',
    color: 'var(--text)',
    fontSize: '10px',
    fontFamily: "'Press Start 2P', monospace",
    padding: '4px 8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const btnSmall: React.CSSProperties = { ...btnStyle, padding: '3px 6px', fontSize: '8px' };

  const titleBar: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '3px 4px',
    background: 'linear-gradient(90deg, var(--win-title), var(--accent-dim), var(--win-title))',
    borderBottom: '1px solid var(--win-border-dark)',
  };

  const titleText: React.CSSProperties = {
    fontSize: '7px', color: 'var(--accent)', letterSpacing: '2px',
  };

  const windowBox: React.CSSProperties = {
    width: 340, marginTop: 2, background: 'var(--win-bg)', ...bevel(),
    boxShadow: '0 0 10px var(--kintsugi-glow)',
  };

  const trackName = currentSong?.title ?? 'KINTSUGI PLAYER';

  return (
    <div style={{ fontFamily: "'Press Start 2P', monospace", userSelect: 'none' }}>

      {/* === MAIN WINDOW === */}
      <div style={{
        width: 340, background: 'var(--win-bg)', ...bevel(),
        boxShadow: '0 0 20px var(--kintsugi-glow), inset 0 0 30px rgba(0,0,0,0.3)',
      }}>
        {/* Title bar */}
        <div style={titleBar}>
          <span style={titleText}>KINTSUGI PLAYER</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setEqVisible(!eqVisible)} style={{ ...btnSmall, fontSize: '6px', padding: '2px 4px', color: eqVisible ? 'var(--lcd-text)' : 'var(--text)' }}>EQ</button>
            <button onClick={() => setMixerVisible(!mixerVisible)} style={{ ...btnSmall, fontSize: '6px', padding: '2px 4px', color: mixerVisible ? 'var(--lcd-text)' : 'var(--text)' }}>MIX</button>
            <button onClick={() => setLibVisible(!libVisible)} style={{ ...btnSmall, fontSize: '6px', padding: '2px 4px', color: libVisible ? 'var(--lcd-text)' : 'var(--text)' }}>LIB</button>
          </div>
        </div>

        {/* LCD Display */}
        <div style={{
          margin: '4px', padding: '6px', background: 'var(--lcd-bg)',
          ...bevel(true), position: 'relative', overflow: 'hidden', height: 52,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '7px', color: 'var(--lcd-text-dim)' }}>{stems.length} stems</span>
            <span style={{ fontSize: '7px', color: 'var(--lcd-text-dim)' }}>44kHz</span>
            <span style={{ fontSize: '7px', color: playing ? 'var(--lcd-text)' : 'var(--lcd-text-dim)' }}>stereo</span>
          </div>
          <div style={{ overflow: 'hidden', width: '100%' }}>
            <div style={{
              color: 'var(--lcd-text)', fontSize: '9px', whiteSpace: 'nowrap',
              animation: trackName.length > 30 ? 'marquee 8s linear infinite' : 'none',
            }}>
              {currentSong ? `${currentSong.artist} - ${trackName}` : trackName}
            </div>
          </div>
          <div style={{ position: 'absolute', right: 8, bottom: 6, fontSize: '14px', color: 'var(--lcd-text)', fontFamily: "'Press Start 2P', monospace", textShadow: '0 0 6px var(--lcd-text)' }}>
            {fmt(currentTime)}
          </div>
          <div style={{
            position: 'absolute', top: 0, right: 40, width: 1, height: '100%',
            background: 'linear-gradient(180deg, transparent 10%, var(--kintsugi-gold) 30%, transparent 50%, var(--kintsugi-gold) 70%, transparent 90%)',
            opacity: 0.4,
          }} />
        </div>

        {/* Seek bar */}
        <div style={{ margin: '0 4px', padding: '2px 0' }}>
          <div onClick={seekTo} style={{
            height: 8, background: 'var(--lcd-bg)', ...bevel(true), cursor: 'pointer', position: 'relative',
          }}>
            <div style={{
              height: '100%', width: duration ? `${(currentTime / duration) * 100}%` : '0%',
              background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))',
              transition: dragging ? 'none' : 'width 0.1s',
            }} />
            {duration > 0 && <div style={{
              position: 'absolute', top: -2, left: duration ? `${(currentTime / duration) * 100}%` : '0%',
              width: 6, height: 12, background: 'var(--accent)', transform: 'translateX(-3px)',
              ...bevel(), cursor: 'grab',
            }} />}
          </div>
        </div>

        {/* Transport controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, padding: '4px' }}>
          <button onClick={() => playSongByOffset(-1)} style={btnStyle} title="Previous Song">{'\u23EE'}</button>
          <button onClick={togglePlay} style={{ ...btnStyle, color: playing ? 'var(--lcd-text)' : 'var(--accent)', minWidth: 36 }}>
            {playing ? '\u25AE\u25AE' : '\u25B6'}
          </button>
          <button onClick={() => {
            stemAudioRef.current.forEach(sa => { sa.el.pause(); sa.el.currentTime = 0; });
            setPlaying(false); setCurTime(0);
          }} style={btnStyle} title="Stop">{'\u25A0'}</button>
          <button onClick={() => playSongByOffset(1)} style={btnStyle} title="Next Song">{'\u23ED'}</button>
        </div>

        {/* Volume row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px 4px', gap: 6 }}>
          <span style={{ fontSize: '6px', color: 'var(--text)', width: 20 }}>VOL</span>
          <div onClick={setVol} style={{ flex: 1, height: 6, background: 'var(--lcd-bg)', ...bevel(true), cursor: 'pointer', position: 'relative' }}>
            <div style={{ height: '100%', width: `${masterVolume}%`, background: 'linear-gradient(90deg, var(--lcd-text-dim), var(--lcd-text))' }} />
          </div>
          <span style={{ fontSize: '7px', color: 'var(--lcd-text)', width: 28, textAlign: 'right' }}>{masterVolume}%</span>
        </div>
      </div>

      {/* === EQ WINDOW === */}
      {eqVisible && (
        <div style={windowBox}>
          <div style={{ ...titleBar, justifyContent: 'flex-start' }}>
            <span style={titleText}>EQUALIZER</span>
          </div>
          <div style={{ padding: 4 }}>
            <canvas ref={canvasRef} width={328} height={60} style={{ width: '100%', height: 60, ...bevel(true), display: 'block' }} />
          </div>
        </div>
      )}

      {/* === STEM MIXER WINDOW === */}
      {mixerVisible && stems.length > 0 && (
        <div style={windowBox}>
          <div style={titleBar}>
            <span style={titleText}>STEM MIXER</span>
            <span style={{ fontSize: '6px', color: 'var(--text)' }}>{stems.length} stems</span>
          </div>
          <div style={{ padding: '4px' }}>
            {stems.map((stem, i) => {
              const hasSolo = stems.some(s => s.solo);
              const active = hasSolo ? stem.solo : !stem.muted;
              return (
                <div key={stem.name} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 2px',
                  borderBottom: i < stems.length - 1 ? '1px solid var(--groove-dark)' : 'none',
                  opacity: active ? 1 : 0.4,
                }}>
                  {/* Stem name */}
                  <span style={{
                    fontSize: '7px', color: active ? 'var(--text-bright)' : 'var(--text)',
                    width: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{stem.name}</span>

                  {/* Volume slider */}
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      setStemVolume(i, Math.round(pct * 100));
                    }}
                    style={{
                      flex: 1, height: 6, background: 'var(--lcd-bg)', ...bevel(true),
                      cursor: 'pointer', position: 'relative',
                    }}
                  >
                    <div style={{
                      height: '100%', width: `${stem.volume}%`,
                      background: active
                        ? 'linear-gradient(90deg, var(--accent-dim), var(--accent))'
                        : 'var(--win-border-dark)',
                    }} />
                  </div>

                  {/* Volume % */}
                  <span style={{ fontSize: '6px', color: 'var(--lcd-text-dim)', width: 22, textAlign: 'right' }}>
                    {stem.volume}%
                  </span>

                  {/* Mute */}
                  <button
                    onClick={() => toggleStemMute(i)}
                    style={{
                      ...btnSmall, fontSize: '6px', padding: '2px 4px',
                      color: stem.muted ? '#ff4444' : 'var(--text)',
                      background: stem.muted ? 'var(--lcd-bg)' : 'var(--button-face)',
                    }}
                  >M</button>

                  {/* Solo */}
                  <button
                    onClick={() => toggleStemSolo(i)}
                    style={{
                      ...btnSmall, fontSize: '6px', padding: '2px 4px',
                      color: stem.solo ? 'var(--lcd-text)' : 'var(--text)',
                      background: stem.solo ? 'var(--lcd-bg)' : 'var(--button-face)',
                    }}
                  >S</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === LIBRARY WINDOW === */}
      {libVisible && (
        <div style={windowBox}>
          <div style={titleBar}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setView('library')}
                style={{ ...btnSmall, fontSize: '6px', padding: '2px 4px', color: view === 'library' ? 'var(--lcd-text)' : 'var(--text)', background: 'none', border: 'none' }}
              >LIBRARY</button>
              {currentSong && (
                <button
                  onClick={() => setView('info')}
                  style={{ ...btnSmall, fontSize: '6px', padding: '2px 4px', color: view === 'info' ? 'var(--lcd-text)' : 'var(--text)', background: 'none', border: 'none' }}
                >INFO</button>
              )}
            </div>
            <span style={{ fontSize: '6px', color: 'var(--text)' }}>{LIBRARY.length} songs</span>
          </div>

          {view === 'library' ? (
            <div style={{ ...bevel(true), margin: 4 }}>
              {LIBRARY.map((song) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => {
                      loadSong(song);
                      setTimeout(() => {
                        const ctx = ctxRef.current;
                        if (ctx?.state === 'suspended') ctx.resume();
                        stemAudioRef.current.forEach(sa => sa.el.play());
                        setPlaying(true);
                      }, 100);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px',
                      background: isActive ? 'var(--win-title)' : 'transparent',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--groove-dark)',
                    }}
                  >
                    <span style={{
                      fontSize: '7px',
                      color: isActive && playing ? 'var(--lcd-text)' : 'var(--lcd-text-dim)',
                      width: 12,
                    }}>
                      {isActive && playing ? '\u25B6' : '\u266A'}
                    </span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '8px',
                        color: isActive ? 'var(--text-bright)' : 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{song.title}</div>
                      <div style={{
                        fontSize: '6px',
                        color: 'var(--lcd-text-dim)',
                        marginTop: 2,
                      }}>{song.artist}</div>
                    </div>
                    <span style={{ fontSize: '6px', color: 'var(--accent-dim)' }}>{song.stems.length} stems</span>
                  </div>
                );
              })}
            </div>
          ) : currentSong && (
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: '9px', color: 'var(--text-bright)', marginBottom: 4 }}>{currentSong.title}</div>
              <div style={{ fontSize: '7px', color: 'var(--accent)', marginBottom: 6 }}>{currentSong.artist}</div>
              <div style={{ fontSize: '6px', color: 'var(--text)', lineHeight: '1.6', marginBottom: 8 }}>{currentSong.description}</div>
              <div style={{ fontSize: '6px', color: 'var(--lcd-text-dim)', marginBottom: 2 }}>IPFS: {currentSong.ipfsCid.slice(0, 12)}...{currentSong.ipfsCid.slice(-6)}</div>
              <div style={{ fontSize: '6px', color: 'var(--lcd-text-dim)', marginBottom: 2 }}>Royalty: {currentSong.royalty}%</div>
              <div style={{ fontSize: '6px', color: 'var(--lcd-text-dim)' }}>Album: {currentSong.album}</div>
            </div>
          )}
        </div>
      )}

      {/* Gold kintsugi crack detail */}
      <div style={{
        width: 340, height: 3, marginTop: 1,
        background: 'linear-gradient(90deg, transparent 10%, var(--kintsugi-gold) 20%, transparent 25%, transparent 60%, var(--kintsugi-gold) 70%, transparent 80%)',
        opacity: 0.5,
      }} />

      {/* branding */}
      <div style={{ width: 340, textAlign: 'center', padding: '6px 0' }}>
        <span style={{ fontSize: '6px', color: 'var(--accent-dim)', letterSpacing: '3px' }}>KINTSUGI DECENTRALIZED MEDIA</span>
      </div>

      {/* footer */}
      <div style={{ width: 340, textAlign: 'center', padding: '2px 0 6px' }}>
        <span style={{ fontSize: '5px', color: 'var(--accent-dim)', opacity: 0.6, letterSpacing: '1.5px' }}>
          FILM3 PRODUCTION PIPELINE | <a href="https://patternintegrity.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-dim)', textDecoration: 'none' }}>PATTERN INTEGRITY</a>
        </span>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: var(--lcd-bg); }
        ::-webkit-scrollbar-thumb { background: var(--button-face); border: 1px solid var(--win-border-light); }
        button:active { transform: translateY(1px); }
      `}</style>
    </div>
  );
}
