import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

const CHOICE_KEY = 'clubpluto_music';
const VOLUME = 0.16;

const tracks = [
  { src: '/ophanim.mp3' },
  { src: '/hardcore.mp3' },
] as const;

interface MusicValue {
  ask: boolean;
  accepted: boolean;
  playing: boolean;
  accept: () => void;
  decline: () => void;
  toggle: () => void;
}

const MusicContext = createContext<MusicValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const indexRef = useRef(0);
  const [ask, setAsk] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [playing, setPlaying] = useState(false);

  function playAt(index: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = index % tracks.length;
    indexRef.current = next;
    const src = tracks[next].src;
    if (!audio.src.endsWith(src)) audio.src = src;
    audio.volume = VOLUME;
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  useEffect(() => {
    const choice = sessionStorage.getItem(CHOICE_KEY);
    if (choice === 'nej') return;
    if (choice === 'on' || choice === 'ja' || choice === 'off') {
      setAccepted(true);
      if (choice === 'on' || choice === 'ja') {
        const start = () => playAt(0);
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
    playAt(0);
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
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    playAt(0);
  }

  function advance() {
    playAt(indexRef.current + 1);
  }

  return (
    <MusicContext.Provider value={{ ask, accepted, playing, accept, decline, toggle }}>
      {children}
      <audio ref={audioRef} preload="none" onEnded={advance} />
      {ask && (
        <div className="music-ask" role="dialog" aria-modal="true" aria-labelledby="music-title">
          <div className="music-card">
            <p id="music-title">Vill du ha musik?</p>
            <div className="music-actions">
              <button type="button" className="btn" onClick={accept}>
                Ja
              </button>
              <button type="button" className="btn" onClick={decline}>
                Nej
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
