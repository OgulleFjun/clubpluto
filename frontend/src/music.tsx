import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const CHOICE_KEY = 'clubpluto_music';
const TRACK = '/ophanim.mp3';
const VOLUME = 0.16;

interface MusicValue {
  ask: boolean;
  accepted: boolean;
  playing: boolean;
  accept: () => void;
  decline: () => void;
  toggle: () => void;
  sampleLevel: () => number;
}

const MusicContext = createContext<MusicValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const binsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const levelRef = useRef(0);
  const wiredRef = useRef(false);
  const [ask, setAsk] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const german = useLocation().pathname === '/';

  function wire(audio: HTMLAudioElement) {
    if (wiredRef.current) {
      void audioCtxRef.current?.resume();
      return;
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.62;
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    binsRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    wiredRef.current = true;
    void ctx.resume();
  }

  const sampleLevel = useCallback(() => {
    const analyser = analyserRef.current;
    const bins = binsRef.current;
    if (!analyser || !bins) {
      levelRef.current *= 0.9;
      return levelRef.current;
    }
    analyser.getByteFrequencyData(bins);
    let bass = 0;
    const count = Math.min(5, bins.length);
    for (let i = 0; i < count; i++) bass += bins[i];
    const next = bass / (count * 255);
    levelRef.current = levelRef.current * 0.68 + next * 0.32;
    return levelRef.current;
  }, []);

  function play() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.src.endsWith(TRACK)) audio.src = TRACK;
    audio.volume = VOLUME;
    wire(audio);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  useEffect(() => {
    const choice = sessionStorage.getItem(CHOICE_KEY);
    if (choice === 'nej') return;
    if (choice === 'on' || choice === 'ja' || choice === 'off') {
      setAccepted(true);
      if (choice === 'on' || choice === 'ja') {
        const start = () => play();
        window.addEventListener('pointerdown', start, { once: true });
        return () => window.removeEventListener('pointerdown', start);
      }
      return;
    }
    setAsk(true);
  }, []);

  function accept() {
    sessionStorage.setItem(CHOICE_KEY, 'on');
    setAccepted(true);
    setAsk(false);
    play();
  }

  function decline() {
    sessionStorage.setItem(CHOICE_KEY, 'nej');
    setAsk(false);
    setAccepted(false);
    setPlaying(false);
    audioRef.current?.pause();
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      sessionStorage.setItem(CHOICE_KEY, 'off');
      return;
    }
    sessionStorage.setItem(CHOICE_KEY, 'on');
    if (audio.src) {
      audio.volume = VOLUME;
      wire(audio);
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    play();
  }

  return (
    <MusicContext.Provider value={{ ask, accepted, playing, accept, decline, toggle, sampleLevel }}>
      {children}
      <audio ref={audioRef} loop preload="none" />
      {ask && (
        <div className="music-ask" role="dialog" aria-modal="true" aria-labelledby="music-title">
          <div className="music-card">
            <p id="music-title">{german ? 'Musik?' : 'Vill du ha musik?'}</p>
            <div className="music-actions">
              <button type="button" className="btn" onClick={accept}>
                Ja
              </button>
              <button type="button" className="btn" onClick={decline}>
                {german ? 'Nein' : 'Nej'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MusicContext.Provider>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.4 9h3.4L11 4.4v15.2L5.8 15H2.4z" />
      {muted ? (
        <path d="M13.2 7.4l8 9.2M21.2 7.4l-8 9.2" />
      ) : (
        <>
          <path d="M14.4 9.1a3.5 3.5 0 0 1 0 5.8" />
          <path d="M17.1 6.6a6.8 6.8 0 0 1 0 10.8" />
        </>
      )}
    </svg>
  );
}

export function useMusic() {
  const value = useContext(MusicContext);
  if (!value) throw new Error('Musik saknas');
  return value;
}

export function MusicToggle() {
  const music = useContext(MusicContext);
  if (!music?.accepted) return null;
  const muted = !music.playing;
  return (
    <button
      type="button"
      className="music-toggle"
      onClick={music.toggle}
      aria-pressed={muted}
      aria-label={muted ? 'Sätt på musiken' : 'Stäng av musiken'}
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}
