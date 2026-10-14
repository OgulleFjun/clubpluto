import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Field, Guard, Page, Portrait, onSubmit } from '../ui';

interface HomeData {
  participant: {
    name: string;
    alias: string | null;
    canInvite: boolean;
    checkedIn: boolean;
    baseChipsIssued: boolean;
    isVampire: boolean;
    doorCode: string;
    photoToken: string;
    hasPhoto: boolean;
    membership: string;
  };
  balances: { baseChips: number; prizeChips: number };
  counts: { identityGuesses: number; vampireGuesses: number };
  phases: { identityOpen: boolean; resultsRevealed: boolean; useAliases: boolean };
  score: { total: number; isWinner: boolean } | null;
}

export default function Club() {
  return (
    <Guard roles={['participant']}>
      <ClubInner />
    </Guard>
  );
}

function ClubInner() {
  const { token, refresh } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    api<HomeData>('/club/home', {}, token).then(setData).catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    setPasswordMessage('');
    setError('');
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          newPassword: form.get('newPassword'),
        }),
      }, token);
      setPasswordMessage('Lösenordet är bytt.');
      event.currentTarget.reset();
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Bytet misslyckades.');
    }
  }

  if (!data) return <Page title="Din klubb">{error || 'Hämtar din sida…'}</Page>;
  const person = data.participant;
  return (
    <Page title={person.name} lede={data.phases.useAliases && person.alias ? `Kallas ${person.alias} inne på klubben.` : 'Din sida i medlemsregistret.'}>
      <div className="split">
        <article className="card">
          {person.hasPhoto && <Portrait token={person.photoToken} alt="Ditt porträtt" />}
          <p>Dörrkod: <strong>{person.doorCode}</strong></p>
          <p>{person.checkedIn ? 'Du är incheckad.' : 'Du är inte incheckad ännu.'}</p>
          <p>{person.baseChipsIssued ? 'Spelmarkerna, värda 100, är markerade som utlämnade.' : 'Spelmarkerna lämnas ut hos Managern.'}</p>
          <p>Spelmarkerna kan tas med mellan borden och kan inte bytas mot priser. Bara prismarker köper priser.</p>
          <p>Registrerade spelmarker: {data.balances.baseChips}. Registrerade prismarker: {data.balances.prizeChips}.</p>
          <p className="meta">Pokerhänder och markhögar vid borden räknas på de fysiska markerna, inte här.</p>
          {person.isVampire && (
            <p>Du är vampyr. Du har fördelarna, och du kan inte vinna överlevnadspriset. Det syns inte för de andra.</p>
          )}
          <p>Identitetsgissningar: {data.counts.identityGuesses}. Vampyrgissningar: {data.counts.vampireGuesses}.</p>
          {data.score && <p>Din slutpoäng: {data.score.total}{data.score.isWinner ? ' · du vann överlevnadspriset' : ''}</p>}
          <div className="actions">
            <Link className="btn" to="/mysteriet">{data.phases.identityOpen ? 'Till mysteriet' : 'Mysteriet'}</Link>
            {person.canInvite && <Link className="btn ghost" to="/inbjudningar">Bjud in gäster</Link>}
          </div>
        </article>
        <form className="card" onSubmit={onSubmit(changePassword)}>
          <h2>Byt lösenord</h2>
          <Field label="Nuvarande"><input name="currentPassword" type="password" required /></Field>
          <Field label="Nytt, minst 8 tecken"><input name="newPassword" type="password" minLength={8} required /></Field>
          <ErrorText>{error}</ErrorText>
          {passwordMessage && <p className="ok">{passwordMessage}</p>}
          <button className="btn" type="submit">Spara</button>
        </form>
      </div>
    </Page>
  );
}
