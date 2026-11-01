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
    isFirst: boolean;
    doorCode: string;
    photoToken: string;
    hasPhoto: boolean;
    costumeToken: string | null;
    membership: string;
  };
  counts: { identityGuesses: number; vampireGuesses: number };
  phases: { identityOpen: boolean; costumeUploadOpen: boolean; competitionClosed: boolean; resultsRevealed: boolean; useAliases: boolean };
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
  const { token } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);

  function load() {
    return api<HomeData>('/club/home', {}, token).then(setData);
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function sendCostume(event: FormEvent<HTMLFormElement>) {
    setError('');
    setMessage('');
    const form = event.currentTarget;
    try {
      await api('/club/costume', { method: 'POST', body: new FormData(form) }, token);
      form.reset();
      setVersion(Date.now());
      setMessage('Bilden ligger i mysteriet.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Bilden sparades inte.');
    }
  }

  if (!data) return <Page title="Din klubb">{error || 'Hämtar din sida…'}</Page>;
  const person = data.participant;
  return (
    <Page title={person.name} lede={data.phases.useAliases && person.alias ? `Kallas ${person.alias} inne på klubben.` : 'Din sida.'}>
      <div className="member">
        {person.hasPhoto && <Portrait token={person.photoToken} alt="Ditt porträtt" />}
        {data.phases.costumeUploadOpen && !data.phases.competitionClosed && person.membership !== 'staff' && (
          <form className="card" onSubmit={onSubmit(sendCostume)}>
            <h2>{person.costumeToken ? 'Din bild i mysteriet' : 'Ta en bild i din utklädnad'}</h2>
            {person.costumeToken && <Portrait token={person.costumeToken} alt="Du i utklädnad" version={version} />}
            <p className="meta">
              Ta bilden med masken på, så som du ser ut i kväll. Den syns i mysteriet utan ditt namn. Visa den inte för någon.
            </p>
            <Field label={person.costumeToken ? 'Ny bild' : 'Bild i utklädnad'}>
              <input name="costume" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required />
            </Field>
            <button className="btn" type="submit">{person.costumeToken ? 'Byt bilden' : 'Lägg i mysteriet'}</button>
            {message && <p className="ok">{message}</p>}
          </form>
        )}
        <p className="member-code">Dörrkod <strong>{person.doorCode}</strong></p>
        <p>{person.checkedIn ? 'Du är incheckad.' : 'Du är inte incheckad ännu.'}</p>
        <p>{person.baseChipsIssued ? 'Spelmarkerna är utlämnade.' : 'Spelmarkerna lämnas ut hos Managern.'}</p>
        <p>De kan tas med mellan borden. Blodspengar kan ges bort. Bara barn och ungdomar kan vinna priser hos Prize Master.</p>
        {person.isVampire && person.isFirst && (
          <article className="card">
            <h2>Du är Den Förste</h2>
            <p>Du är startvampyren. Kvällen börjar med dig.</p>
            <p>Du har två vampyrkort. Ge ett kort till en gäst som frivilligt vill bli vampyr. Den som tar emot kortet anmäler sig i Banken och tar över kortet.</p>
            <p>För varje person du gör till vampyr får du 1 blodspeng, högst 2.</p>
            <p>Säg det inte till någon. Det syns inte för de andra.</p>
          </article>
        )}
        {person.isVampire && !person.isFirst && <p>Du är vampyr. Det syns inte för de andra.</p>}
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
        <ErrorText>{error}</ErrorText>
      </div>
    </Page>
  );
}
