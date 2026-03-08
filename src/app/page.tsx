'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import './globals.css';

interface Track {
  id: string;
  name: string;
  url: string;
  duration: number;
}

export default function KintsugiPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<number>(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [dragging, setDragging] = useState(false);
  const [eqVisible, setEqVisible] = useState(true);
  const [plVisible, setPlVisible] = useState(true);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const initAudio = useCallback(() => {
    if (!audioRef.current || ctxRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const tick = () => { if (!dragging) setCurTime(audio.currentTime); };
    const onEnd = () => {
      if (repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
      if (currentTrack < tracks.length - 1) playTrack(currentTrack + 1);
      else if (repeat === 'all') playTrack(0);
      else setPlaying(false);
    };
    audio.addEventListener('timeupdate', tick);
    audio.addEventListener('ended', onEnd);
    return () => { audio.removeEventListener('timeupdate', tick); audio.removeEventListener('ended', onEnd); };
  });

  const playTrack = (idx: number) => {
    if (idx < 0 || idx >= tracks.length) return;
    initAudio();
    const audio = audioRef.current!;
    audio.src = tracks[idx].url;
    audio.volume = volume / 100;
    audio.play();
    setCurrentTrack(idx);
    setPlaying(true);
    setDuration(tracks[idx].duration);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (currentTrack === -1 && tracks.length > 0) { playTrack(0); return; }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { initAudio(); audioRef.current.play(); setPlaying(true); }
  };

  const addFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,video/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      const newTracks: Track[] = [];
      for (const file of Array.from(files)) {
        const url = URL.createObjectURL(file);
        const dur = await new Promise<number>((res) => {
          const el = document.createElement('audio');
          el.src = url;
          el.onloadedmetadata = () => res(el.duration);
          el.onerror = () => res(0);
        });
        newTracks.push({ id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: file.name.replace(/\.[^.]+$/, ''), url, duration: dur });
      }
      setTracks(prev => [...prev, ...newTracks]);
    };
    input.click();
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && duration) {
      audioRef.current.currentTime = pct * duration;
      setCurTime(pct * duration);
    }
  };

  const setVol = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.round(pct * 100);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v / 100;
  };

  const removeTrack = (idx: number) => {
    setTracks(prev => prev.filter((_, i) => i !== idx));
    if (idx === currentTrack) { setPlaying(false); setCurrentTrack(-1); }
    else if (idx < currentTrack) setCurrentTrack(prev => prev - 1);
  };

  // Winamp-style beveled border
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

  const trackName = currentTrack >= 0 ? tracks[currentTrack]?.name ?? '' : 'KINTSUGI PLAYER';

  return (
    <div style={{ fontFamily: "'Press Start 2P', monospace", userSelect: 'none' }}>
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* === MAIN WINDOW === */}
      <div style={{
        width: 340, background: 'var(--win-bg)', ...bevel(),
        boxShadow: '0 0 20px var(--kintsugi-glow), inset 0 0 30px rgba(0,0,0,0.3)',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '3px 4px', background: 'linear-gradient(90deg, var(--win-title), var(--accent-dim), var(--win-title))',
          borderBottom: '1px solid var(--win-border-dark)',
        }}>
          <span style={{ fontSize: '7px', color: 'var(--accent)', letterSpacing: '2px' }}>KINTSUGI PLAYER</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setEqVisible(!eqVisible)} style={{ ...btnSmall, fontSize: '6px', padding: '2px 4px', color: eqVisible ? 'var(--lcd-text)' : 'var(--text)' }}>EQ</button>
            <button onClick={() => setPlVisible(!plVisible)} style={{ ...btnSmall, fontSize: '6px', padding: '2px 4px', color: plVisible ? 'var(--lcd-text)' : 'var(--text)' }}>PL</button>
          </div>
        </div>

        {/* LCD Display */}
        <div style={{
          margin: '4px', padding: '6px', background: 'var(--lcd-bg)',
          ...bevel(true), position: 'relative', overflow: 'hidden', height: 52,
        }}>
          {/* Bitrate / kHz / stereo badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '7px', color: 'var(--lcd-text-dim)' }}>192kbps</span>
            <span style={{ fontSize: '7px', color: 'var(--lcd-text-dim)' }}>44kHz</span>
            <span style={{ fontSize: '7px', color: playing ? 'var(--lcd-text)' : 'var(--lcd-text-dim)' }}>stereo</span>
          </div>
          {/* Scrolling track name */}
          <div style={{ overflow: 'hidden', width: '100%' }}>
            <div ref={marqueeRef} style={{
              color: 'var(--lcd-text)', fontSize: '9px', whiteSpace: 'nowrap',
              animation: trackName.length > 30 ? 'marquee 8s linear infinite' : 'none',
            }}>
              {trackName}
            </div>
          </div>
          {/* Time */}
          <div style={{ position: 'absolute', right: 8, bottom: 6, fontSize: '14px', color: 'var(--lcd-text)', fontFamily: "'Press Start 2P', monospace", textShadow: '0 0 6px var(--lcd-text)' }}>
            {fmt(currentTime)}
          </div>
          {/* Kintsugi gold crack accent */}
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
          <button onClick={() => currentTrack > 0 && playTrack(currentTrack - 1)} style={btnStyle} title="Previous">{'\u23EE'}</button>
          <button onClick={togglePlay} style={{ ...btnStyle, color: playing ? 'var(--lcd-text)' : 'var(--accent)', minWidth: 36 }}>
            {playing ? '\u25AE\u25AE' : '\u25B6'}
          </button>
          <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; setPlaying(false); setCurTime(0); } }} style={btnStyle} title="Stop">{'\u25A0'}</button>
          <button onClick={() => currentTrack < tracks.length - 1 && playTrack(currentTrack + 1)} style={btnStyle} title="Next">{'\u23ED'}</button>
          <div style={{ width: 8 }} />
          <button onClick={addFiles} style={{ ...btnStyle, fontSize: '8px' }} title="Add files">+FILE</button>
        </div>

        {/* Volume & toggles row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px 4px', gap: 6 }}>
          <span style={{ fontSize: '6px', color: 'var(--text)', width: 20 }}>VOL</span>
          <div onClick={setVol} style={{ flex: 1, height: 6, background: 'var(--lcd-bg)', ...bevel(true), cursor: 'pointer', position: 'relative' }}>
            <div style={{ height: '100%', width: `${volume}%`, background: 'linear-gradient(90deg, var(--lcd-text-dim), var(--lcd-text))' }} />
          </div>
          <span style={{ fontSize: '7px', color: 'var(--lcd-text)', width: 28, textAlign: 'right' }}>{volume}%</span>
          <button onClick={() => setShuffle(!shuffle)} style={{ ...btnSmall, color: shuffle ? 'var(--lcd-text)' : 'var(--text)' }}>SHF</button>
          <button onClick={() => setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')} style={{ ...btnSmall, color: repeat !== 'off' ? 'var(--lcd-text)' : 'var(--text)' }}>
            {repeat === 'one' ? 'RP1' : 'RPT'}
          </button>
        </div>
      </div>

      {/* === EQ WINDOW === */}
      {eqVisible && (
        <div style={{
          width: 340, marginTop: 2, background: 'var(--win-bg)', ...bevel(),
          boxShadow: '0 0 10px var(--kintsugi-glow)',
        }}>
          <div style={{
            padding: '3px 4px', background: 'linear-gradient(90deg, var(--win-title), var(--accent-dim), var(--win-title))',
            borderBottom: '1px solid var(--win-border-dark)',
            fontSize: '7px', color: 'var(--accent)', letterSpacing: '2px',
          }}>EQUALIZER</div>
          <div style={{ padding: 4 }}>
            <canvas ref={canvasRef} width={328} height={60} style={{ width: '100%', height: 60, ...bevel(true), display: 'block' }} />
          </div>
        </div>
      )}

      {/* === PLAYLIST WINDOW === */}
      {plVisible && (
        <div style={{
          width: 340, marginTop: 2, background: 'var(--win-bg)', ...bevel(),
          boxShadow: '0 0 10px var(--kintsugi-glow)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '3px 4px', background: 'linear-gradient(90deg, var(--win-title), var(--accent-dim), var(--win-title))',
            borderBottom: '1px solid var(--win-border-dark)',
          }}>
            <span style={{ fontSize: '7px', color: 'var(--accent)', letterSpacing: '2px' }}>PLAYLIST</span>
            <span style={{ fontSize: '6px', color: 'var(--text)' }}>{tracks.length} tracks</span>
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto', ...bevel(true), margin: 4 }}>
            {tracks.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '8px', color: 'var(--lcd-text-dim)', marginBottom: 8 }}>drag files here or click +FILE</div>
                <div style={{ fontSize: '6px', color: 'var(--accent-dim)' }}>supports mp3, wav, ogg, flac, mp4</div>
              </div>
            ) : (
              tracks.map((t, i) => (
                <div key={t.id} onClick={() => playTrack(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                  background: i === currentTrack ? 'var(--win-title)' : 'transparent',
                  cursor: 'pointer', borderBottom: '1px solid var(--groove-dark)',
                }}>
                  <span style={{ fontSize: '7px', color: i === currentTrack ? 'var(--lcd-text)' : 'var(--lcd-text-dim)', width: 16, textAlign: 'right' }}>
                    {i === currentTrack && playing ? '\u25B6' : `${i + 1}.`}
                  </span>
                  <span style={{ fontSize: '7px', color: i === currentTrack ? 'var(--text-bright)' : 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: '7px', color: 'var(--lcd-text-dim)' }}>{fmt(t.duration)}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeTrack(i); }} style={{ background: 'none', border: 'none', color: 'var(--accent-dim)', fontSize: '8px', cursor: 'pointer', padding: '0 2px' }}>x</button>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px 4px', alignItems: 'center' }}>
            <button onClick={addFiles} style={btnSmall}>+ ADD</button>
            <button onClick={() => setTracks([])} style={{ ...btnSmall, color: 'var(--accent-dim)' }}>CLEAR</button>
          </div>
        </div>
      )}

      {/* Gold kintsugi crack detail */}
      <div style={{
        width: 340, height: 3, marginTop: 1,
        background: 'linear-gradient(90deg, transparent 10%, var(--kintsugi-gold) 20%, transparent 25%, transparent 60%, var(--kintsugi-gold) 70%, transparent 80%)',
        opacity: 0.5,
      }} />

      {/* film3 branding */}
      <div style={{ width: 340, textAlign: 'center', padding: '6px 0' }}>
        <span style={{ fontSize: '6px', color: 'var(--accent-dim)', letterSpacing: '3px' }}>FILM3 / KINTSUGI</span>
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
