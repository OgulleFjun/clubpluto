import { useEffect, useRef, useState } from 'react';

const KEY = 'clubpluto_music';
const VOLUME = 0.16;

export function Music() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY);
    if (saved === 'nej') return;
    if (saved === 'ja') {
      const start = () => {
        void play();
      };
      window.addEventListener('pointerdown', start, { once: true });
      return () => window.removeEventListener('pointerdown', start);
    }
    setAsk(true);
  }, []);

  function play() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;
    void audio.play().catch(() => {});
  }

  function choose(on: boolean) {
    sessionStorage.setItem(KEY, on ? 'ja' : 'nej');
    setAsk(false);
    const audio = audioRef.current;
    if (!audio) return;
    if (!on) {
      audio.pause();
      return;
    }
    play();
  }

  return (
    <>
      <audio ref={audioRef} src="/techno.wav" loop preload="none" />
      {ask && (
        <div className="music-ask" role="dialog" aria-modal="true" aria-labelledby="music-title">
          <div className="music-card">
            <p id="music-title">Vill du ha musik?</p>
            <div className="music-actions">
              <button type="button" className="btn" onClick={() => choose(true)}>
                Ja
              </button>
              <button type="button" className="btn ghost" onClick={() => choose(false)}>
                Nej
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
