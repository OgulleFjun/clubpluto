import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth, User } from '../auth';
import { useMusic } from '../music';
import { ErrorText, Field, onSubmit } from '../ui';

type DoorKind = 'player' | 'staff';

const copy = {
  player: {
    firstName: 'Namn',
    lastName: 'Efternamn',
    enter: 'Logga in',
    first: 'Första gången.',
    alias: 'Alias',
    portrait: 'Porträtt',
    choose: 'Välj bild',
    next: 'Fortsätt',
    back: 'Tillbaka',
    fail: 'Det gick inte att komma in.',
  },
  staff: {
    firstName: 'Namn',
    lastName: 'Efternamn',
    enter: 'Logga in',
    first: 'Första gången.',
    alias: 'Alias',
    portrait: 'Porträtt',
    choose: 'Välj bild',
    next: 'Fortsätt',
    back: 'Tillbaka',
    fail: 'Det gick inte att komma in.',
  },
} as const;

export default function Gate({ kind }: { kind: DoorKind }) {
  const { user, acceptSession } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const door = copy[kind];
  const text = door;
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
          body: JSON.stringify({ firstName, lastName, door: kind }),
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
      data.set('firstName', firstName);
      data.set('lastName', lastName);
      data.set('door', kind);
      const result = await api<{ token: string; user: User }>('/auth/gate-register', {
        method: 'POST',
        body: data,
      });
      acceptSession(result.token, result.user);
      navigate(homeFor(result.user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.fail);
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
        {needsProfile ? (
          <p className="gate-note">{firstName} {lastName}</p>
        ) : (
          <>
            <Field label={text.firstName}>
              <input
                name="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </Field>
            <Field label={text.lastName}>
              <input
                name="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </Field>
          </>
        )}
        {needsProfile && kind === 'player' && (
          <>
            <p className="gate-note">{text.first}</p>
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
        <ErrorText>{error}</ErrorText>
        <button className="btn" type="submit" disabled={busy}>
          {needsProfile ? text.next : text.enter}
        </button>
        {kind === 'player' && !needsProfile && (
          <Link className="btn" to="/personal">Byt till inlogg för personal</Link>
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
