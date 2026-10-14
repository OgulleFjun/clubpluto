import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, ApiError } from './api';

export type Role = 'admin' | 'doorman' | 'gamemaster' | 'participant';

export interface ParticipantBrief {
  id: string;
  name: string;
  alias: string | null;
  canInvite: boolean;
  checkedIn: boolean;
  isVampire: boolean;
  membership: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  staffIntroSeen: boolean;
  displayName: string | null;
  alias: string | null;
  age: number | null;
  participant: ParticipantBrief | null;
}

interface AuthValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  acceptSession: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const STORAGE_KEY = 'clubpluto_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const acceptSession = useCallback((nextToken: string, nextUser: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const refresh = useCallback(async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as { token: string };
    const data = await api<{ user: User }>('/auth/me', {}, stored.token);
    acceptSession(stored.token, data.user);
  }, [acceptSession]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setReady(true);
      return;
    }
    const stored = JSON.parse(raw) as { token: string; user: User };
    setToken(stored.token);
    setUser(stored.user);
    api<{ user: User }>('/auth/me', {}, stored.token)
      .then((data) => acceptSession(stored.token, data.user))
      .catch((error: unknown) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) logout();
      })
      .finally(() => setReady(true));
  }, [acceptSession, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      acceptSession(data.token, data.user);
      return data.user;
    },
    [acceptSession]
  );

  return (
    <AuthContext.Provider value={{ user, token, ready, login, acceptSession, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Auth saknas');
  return value;
}

export function homeFor(role: Role) {
  if (role === 'admin' || role === 'doorman' || role === 'gamemaster') return '/uppdrag';
  return '/klubben';
}
