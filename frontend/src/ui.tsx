import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from './api';
import { homeFor, useAuth } from './auth';
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

export function Layout() {
  const { user, logout } = useAuth();
  const { event } = usePublicEvent();
  const navigate = useNavigate();
  const name = event?.clubName || 'Club Pluto';

  return (
    <MusicProvider>
    <div className={user ? 'shell' : 'shell quiet'}>
      <header className="topbar">
        {user ? (
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
        {user ? (
        <nav className="desktop-nav">
          <NavLink to="/regler">Regler</NavLink>
          <NavLink to="/priser">Priser</NavLink>
          {user?.role === 'participant' && <NavLink to="/klubben">Klubben</NavLink>}
          {user?.role === 'participant' && <NavLink to="/mysteriet">Mysteriet</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Kontrollpanel</NavLink>}
          {user && (user.role === 'admin' || user.role === 'doorman') && <NavLink to="/dorren">Dörren</NavLink>}
          {user && (user.role === 'admin' || user.role === 'gamemaster') && (
            <NavLink to="/spelledare">Spelledare</NavLink>
          )}
          {user ? (
            <button
              className="text-button"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Logga ut
            </button>
          ) : null}
        </nav>
        ) : (
          <NavLink to="/personal" className="personal-link">Inlogg personal</NavLink>
        )}
        {user && (
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
      {user && (
        <footer>
          <span>{name}</span>
          <span>Sala Analoga Spelförening och SUS</span>
        </footer>
      )}
    </div>
    </MusicProvider>
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
