import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth, User } from '../auth';
import { ErrorText, Field, onSubmit } from '../ui';

type DoorKind = 'player' | 'staff';

export default function Gate({ kind }: { kind: DoorKind }) {
  const { user, acceptSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

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
      setError(reason instanceof Error ? reason.message : 'Det stämmer inte.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={needsProfile ? 'gate compact' : 'gate'}>
      <img className="gate-logo" src="/mark.webp" alt="Club Pluto" />
      {kind === 'staff' && <p className="gate-kicker">Personal</p>}
      <form onSubmit={onSubmit(submit)}>
        <Field label="E-post">
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
        <Field label="Lösenord">
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
            <p className="gate-note">Första gången.</p>
            <Field label="Namn">
              <input name="name" required autoComplete="name" />
            </Field>
            {kind === 'player' && (
              <>
                <Field label="Alias">
                  <input name="alias" maxLength={40} autoComplete="off" />
                </Field>
                <Field label="Porträtt">
                  <div className="file-pick">{fileName || 'Välj bild'}</div>
                  <input
                    className="file-input"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}
                  />
                </Field>
              </>
            )}
          </>
        )}
        <ErrorText>{error}</ErrorText>
        <button className="btn" type="submit" disabled={busy}>
          {needsProfile ? 'Fortsätt' : 'Logga in'}
        </button>
        {needsProfile && (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setNeedsProfile(false);
              setError('');
            }}
          >
            Tillbaka
          </button>
        )}
      </form>
    </section>
  );
}
