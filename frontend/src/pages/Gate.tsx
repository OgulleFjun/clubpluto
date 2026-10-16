import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth, User } from '../auth';
import { useMusic } from '../music';
import { ErrorText, Field, onSubmit } from '../ui';

type DoorKind = 'player' | 'staff';

const german: Record<string, string> = {
  'Det stämmer inte.': 'Stimmt nicht.',
  'Stängt.': 'Geschlossen.',
  'Namnet behöver 1–80 tecken.': 'Der Name braucht 1–80 Zeichen.',
  'Aliaset får vara högst 40 tecken.': 'Der Alias darf höchstens 40 Zeichen haben.',
  'Ladda upp ett porträtt.': 'Lade ein Porträt hoch.',
  'Den e-postadressen finns redan.': 'Diese E-Mail gibt es schon.',
  'Något gick fel.': 'Etwas ist schiefgelaufen.',
  'Bilden behöver vara jpg, png eller webp.': 'Das Bild muss jpg, png oder webp sein.',
  'Bilden är större än 8 MB.': 'Das Bild ist größer als 8 MB.',
};

const copy = {
  player: {
    email: 'E-Mail',
    password: 'Passwort',
    enter: 'Logga in',
    first: 'Zum ersten Mal.',
    name: 'Name',
    alias: 'Alias',
    portrait: 'Porträt',
    choose: 'Bild wählen',
    next: 'Weiter',
    back: 'Zurück',
    fail: 'Stimmt nicht.',
  },
  staff: {
    email: 'E-post',
    password: 'Lösenord',
    enter: 'Logga in',
    first: 'Första gången.',
    name: 'Namn',
    alias: 'Alias',
    portrait: 'Porträtt',
    choose: 'Välj bild',
    next: 'Fortsätt',
    back: 'Tillbaka',
    fail: 'Det stämmer inte.',
  },
} as const;

export default function Gate({ kind }: { kind: DoorKind }) {
  const { user, acceptSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const door = copy[kind];
  const text =
    needsProfile && kind === 'player'
      ? {
          ...door,
          email: 'E-post',
          password: 'Lösenord',
          first: 'Första gången.',
          name: 'Namn',
          alias: 'Alias',
          portrait: 'Porträtt',
          choose: 'Välj bild',
          next: 'Fortsätt',
          back: 'Tillbaka',
          fail: 'Det stämmer inte.',
        }
      : door;
  const markRef = useRef<HTMLDivElement>(null);
  const { beatPulse } = useMusic();

  useEffect(() => {
    if (kind !== 'player') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let spin = 0;
    const tick = () => {
      const level = reduced ? 0 : beatPulse();
      spin += reduced ? 0 : 0.12;
      const mark = markRef.current;
      if (mark) {
        mark.style.setProperty('--pulse', level.toFixed(3));
        mark.style.setProperty('--spin', `${spin.toFixed(2)}deg`);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [kind, beatPulse]);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      if (!needsProfile) {
        const result = await api<{ needsProfile?: boolean; token?: string; user?: User }>('/auth/gate', {
          method: 'POST',
          body: JSON.stringify({ email, password, door: kind }),
        });
        if (result.needsProfile) {
          setNeedsProfile(true);
          return;
        }
        if (result.token && result.user) {
          acceptSession(result.token, result.user);
          navigate(homeFor(result.user.role));
        }
        return;
      }
      data.set('email', email);
      data.set('password', password);
      data.set('door', kind);
      const result = await api<{ token: string; user: User }>('/auth/gate-register', {
        method: 'POST',
        body: data,
      });
      acceptSession(result.token, result.user);
      navigate(homeFor(result.user.role));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : text.fail;
      setError(kind === 'player' && !needsProfile ? german[message] || door.fail : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gate">
      {kind === 'player' ? (
        <div className="gate-mark" ref={markRef}>
          <span className="gate-glow" aria-hidden />
          <span className="gate-ring" aria-hidden />
          <span className="gate-ring far" aria-hidden />
          <img className="gate-logo" src="/mark.webp" alt="Club Pluto" />
        </div>
      ) : (
        <h1 className="gate-title">Inlogg personal</h1>
      )}
      <form onSubmit={onSubmit(submit)}>
        <Field label={text.email}>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            readOnly={needsProfile}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={text.password}>
          <input
            name="password"
            type="password"
            autoComplete={needsProfile ? 'new-password' : 'current-password'}
            required
            value={password}
            readOnly={needsProfile}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {needsProfile && (
          <>
            <p className="gate-note">{text.first}</p>
            <Field label={text.name}>
              <input name="name" required autoComplete="name" />
            </Field>
            {kind === 'player' && (
              <>
                <Field label={text.alias}>
                  <input name="alias" required maxLength={40} autoComplete="off" />
                </Field>
                <Field label={text.portrait}>
                  <div className="file-pick">{fileName || text.choose}</div>
                  <input
                    className="file-input"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}
                  />
                  <p className="gate-hint">Ett äkta porträtt av ditt ansikte, utan mask eller förklädnad.</p>
                </Field>
              </>
            )}
          </>
        )}
        <ErrorText>{error}</ErrorText>
        <button className="btn" type="submit" disabled={busy}>
          {needsProfile ? text.next : text.enter}
        </button>
        {kind === 'player' && !needsProfile && (
          <Link className="btn" to="/personal">Inlogg personal</Link>
        )}
        {needsProfile && (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setNeedsProfile(false);
              setError('');
            }}
          >
            {text.back}
          </button>
        )}
      </form>
    </section>
  );
}
