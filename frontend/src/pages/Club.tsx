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
  const [passwordOpen, setPasswordOpen] = useState(false);

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
    <Page title={person.name} lede={data.phases.useAliases && person.alias ? `Kallas ${person.alias} inne på klubben.` : 'Din sida.'}>
      <div className="member">
        {person.hasPhoto && <Portrait token={person.photoToken} alt="Ditt porträtt" />}
        <p className="member-code">Dörrkod <strong>{person.doorCode}</strong></p>
        <p>{person.checkedIn ? 'Du är incheckad.' : 'Du är inte incheckad ännu.'}</p>
        <p>{person.baseChipsIssued ? 'Spelmarkerna är utlämnade.' : 'Spelmarkerna lämnas ut hos Managern.'}</p>
        <p>De kan tas med mellan borden. Bara prismarker köper priser.</p>
        {person.isVampire && <p>Du är vampyr. Det syns inte för de andra.</p>}
        <p className="meta">
          {data.counts.identityGuesses} matchningar · {data.counts.vampireGuesses} vampyrgissningar
          {data.score ? ` · ${data.score.total} poäng${data.score.isWinner ? ' · överlevnadspriset' : ''}` : ''}
        </p>
        <div className="member-actions">
          <Link className="btn" to="/mysteriet">Mysteriet</Link>
          <Link className="btn ghost" to="/priser">Priser</Link>
          <Link className="btn ghost" to="/spel">Spel</Link>
          <Link className="btn ghost" to="/regler">Regler</Link>
          {person.canInvite && <Link className="btn ghost" to="/inbjudningar">Bjud in gäster</Link>}
        </div>
        <button className="btn ghost" type="button" onClick={() => setPasswordOpen((open) => !open)}>
          Byt lösenord
        </button>
        {passwordOpen && (
          <form onSubmit={onSubmit(changePassword)}>
            <Field label="Nuvarande"><input name="currentPassword" type="password" required autoComplete="current-password" /></Field>
            <Field label="Nytt, minst 8 tecken"><input name="newPassword" type="password" minLength={8} required autoComplete="new-password" /></Field>
            {passwordMessage && <p className="ok">{passwordMessage}</p>}
            <button className="btn" type="submit">Spara</button>
          </form>
        )}
        <ErrorText>{error}</ErrorText>
      </div>
    </Page>
  );
}
