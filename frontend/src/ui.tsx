import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from './api';
import { homeFor, useAuth, User } from './auth';
import { MusicProvider, MusicToggle } from './music';
import { gitSha } from 'virtual:git-sha';

export interface PublicEvent {
  clubName: string;
  tagline: string;
  eventStartsAt: string;
  location: string;
  publicIntro: string;
  rulesText: string;
  registrationOpen: boolean;
  resultsRevealed: boolean;
  games: { key: string; name: string; summary: string; rules: string }[];
  prizes: { id: string; name: string; description: string; cost: number; stock: number; imageUrl: string | null }[];
}

export function usePublicEvent() {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<PublicEvent>('/public/event')
      .then(setEvent)
      .catch((reason: Error) => setError(reason.message));
  }, []);
  return { event, error };
}

function isStaff(role: string) {
  return role === 'admin' || role === 'doorman' || role === 'gamemaster';
}

export function Layout() {
  const { user, logout } = useAuth();
  const { event } = usePublicEvent();
  const navigate = useNavigate();
  const name = event?.clubName || 'Club Pluto';
  const staff = !!user && isStaff(user.role);
  const player = !!user && !staff;

  return (
    <MusicProvider>
    <div className={player ? 'shell' : staff ? 'shell staff' : 'shell quiet'}>
      <header className="topbar">
        {staff && user ? (
          <NavLink to="/uppdrag" className="staff-brand">Club Pluto</NavLink>
        ) : player ? (
          <NavLink to={homeFor(user.role)} className="brand">
            <span className="seal">CP</span>
            <span>
              <strong>{name}</strong>
              <small>{event?.tagline || 'Svartklubben'}</small>
            </span>
          </NavLink>
        ) : (
          <span />
        )}
        <div className="topbar-right">
        {staff && user ? (
          <nav className="staff-nav">
            <NavLink to="/uppdrag" end>Uppdrag</NavLink>
            {user.role === 'admin' && <NavLink to="/uppdrag/kontroll">Kontroll</NavLink>}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Logga ut
            </button>
          </nav>
        ) : player ? (
        <nav className="desktop-nav">
          <NavLink to="/regler">Regler</NavLink>
          <NavLink to="/priser">Priser</NavLink>
          <NavLink to="/klubben">Klubben</NavLink>
          <NavLink to="/mysteriet">Mysteriet</NavLink>
          <button
            className="text-button"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logga ut
          </button>
        </nav>
        ) : (
          <NavLink to="/personal" className="personal-link">Inlogg personal</NavLink>
        )}
        {player && (
          <button
            className="text-button mobile-logout"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logga ut
          </button>
        )}
        <span className="git-sha">{gitSha}</span>
        <MusicToggle />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      {user?.role === 'participant' && (
        <nav className="tabbar">
          <NavLink to="/klubben">Klubben</NavLink>
          <NavLink to="/mysteriet">Mysteriet</NavLink>
          <NavLink to="/spel">Spel</NavLink>
          <NavLink to={user.participant?.canInvite ? '/inbjudningar' : '/resultat'}>
            {user.participant?.canInvite ? 'Gäster' : 'Resultat'}
          </NavLink>
        </nav>
      )}
      {player && (
        <footer>
          <span>{name}</span>
          <span>Sala Analoga Spelförening och SUS</span>
        </footer>
      )}
      <StaffIntro />
    </div>
    </MusicProvider>
  );
}

function needsStaffProfile(user: User) {
  if (user.role === 'participant') return false;
  return !user.displayName || !user.alias || user.age == null || user.staffIntroSeen === false;
}

function StaffIntro() {
  const { user, token, acceptSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen(Boolean(user && needsStaffProfile(user)));
  }, [user]);

  if (!open || !user || !token) return null;
  const sessionToken = token;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: User }>('/auth/staff-intro', {
        method: 'POST',
        body: JSON.stringify({
          name: data.get('name'),
          age: Number(data.get('age')),
          alias: data.get('alias'),
        }),
      }, sessionToken);
      acceptSession(sessionToken, result.user);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Det gick inte att spara.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <form className="welcome-card" onSubmit={(event) => void save(event)}>
        <h2 id="welcome-title">Club Pluto</h2>
        <p>Club Pluto är ett spökvampyrlajv. Gästerna kommer förklädda, och vampyrer rör sig bland dem.</p>
        <p><strong>Söndag 1 november 2026.</strong><br />Folkets hus, Sala. Kvällen är i källaren.</p>
        <p>Samling klockan 17:00. Ytterdörren öppnar klockan 18:30.</p>
        <p>Det kommer vara musik. En stor del av upplevelsen är att gissa vem som är vem, så försök ändra rösten.</p>
        <p>Fyll i namn, ålder och alias.</p>
        {user.role === 'gamemaster' && <p>Första steget som spelledare är att välja en roll.</p>}
        <Field label="Namn">
          <input name="name" required maxLength={80} defaultValue={user.displayName || ''} autoComplete="name" />
        </Field>
        <Field label="Ålder">
          <input name="age" type="number" required min={1} max={120} inputMode="numeric" />
        </Field>
        <Field label="Alias">
          <input name="alias" required maxLength={40} defaultValue={user.alias || ''} autoComplete="off" />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button className="btn apply" type="submit" disabled={busy}>
          {user.role === 'gamemaster' ? 'Spara och välj en roll' : 'Spara'}
        </button>
      </form>
    </div>
  );
}

export function Page({ title, lede, children }: { title: string; lede?: string; children?: ReactNode }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </section>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="error">{children}</p>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Portrait({ token, alt }: { token: string; alt: string }) {
  const { token: auth } = useAuth();
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!auth) return;
    let url = '';
    let cancel = false;
    fetch(`${apiBase()}/photos/${token}`, { headers: { Authorization: `Bearer ${auth}` } })
      .then((response) => (response.ok ? response.blob() : Promise.reject()))
      .then((blob) => {
        url = URL.createObjectURL(blob);
        if (!cancel) setSrc(url);
      })
      .catch(() => {
        if (!cancel) setSrc('');
      });
    return () => {
      cancel = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [auth, token]);
  if (!src) return <div className="portrait empty" aria-hidden />;
  return <img className="portrait" src={src} alt={alt} />;
}

function apiBase() {
  return (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') || '/api';
}

export function Guard({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ready) return;
    if (!user) navigate('/');
    else if (roles && !roles.includes(user.role)) navigate(homeFor(user.role));
  }, [ready, user, roles, navigate]);
  if (!ready || !user) return <p className="page">Öppnar dörren…</p>;
  if (roles && !roles.includes(user.role)) return null;
  return <>{children}</>;
}

export function onSubmit(handler: (event: FormEvent<HTMLFormElement>) => Promise<void>) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handler(event);
  };
}
