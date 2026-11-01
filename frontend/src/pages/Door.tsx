import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Field, Guard, Page, Portrait, onSubmit } from '../ui';

interface Overview {
  registered: number;
  arrived: number;
  remaining: number;
  doorPasswordSet: boolean;
}
interface Person {
  id: string;
  name: string;
  alias: string | null;
  email: string;
  doorCode: string;
  checkedInAt: string | null;
  baseChipsIssued: boolean;
  photoToken: string | null;
  inMystery: boolean;
  invitedBy: string | null;
}

const roles = ['admin', 'doorman', 'gamemaster'];

export default function Door() {
  return (
    <Guard roles={roles}>
      <DoorInner />
    </Guard>
  );
}

function DoorInner() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh(q = query) {
    const [stats, found] = await Promise.all([
      api<Overview>('/door/overview', {}, token),
      api<{ participants: Person[] }>(`/door/search?q=${encodeURIComponent(q)}`, {}, token),
    ]);
    setOverview(stats);
    setPeople(found.participants);
  }

  useEffect(() => {
    refresh('').catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function checkIn(id: string) {
    setError('');
    setMessage('');
    try {
      await api(`/door/check-in/${id}`, { method: 'POST', body: JSON.stringify({}) }, token);
      setMessage('Gästen är inne. Ge spelmarker till ett värde av 100.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Incheckningen misslyckades.');
    }
  }

  async function addCostume(event: FormEvent<HTMLFormElement>, id: string) {
    const element = event.currentTarget;
    setError('');
    setMessage('');
    try {
      await api(`/door/costume/${id}`, { method: 'POST', body: new FormData(event.currentTarget) }, token);
      element.reset();
      setMessage('Bilden ligger i mysteriet.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Bilden sparades inte.');
    }
  }

  async function walkIn(event: FormEvent<HTMLFormElement>) {
    const element = event.currentTarget;
    setError('');
    try {
      const form = new FormData(event.currentTarget);
      await api('/door/register', { method: 'POST', body: form }, token);
      element.reset();
      const q = `${form.get('firstName') || ''} ${form.get('lastName') || ''}`.trim();
      setMessage('Gästen är registrerad. Ta bilden i utklädnad och checka in personen nedanför.');
      setQuery(q);
      await refresh(q);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registreringen misslyckades.');
    }
  }

  return (
    <Page title="Dörren" lede="Gästen har redan sagt lösenordet till Bouncern. Sök fram gästen, registrera att den har kommit, ge 100 i spelmarker och se till att bilden i utklädnad finns. Ge sedan reglerna och skicka ut gästen i klubben.">
      {overview && (
        <p>{overview.registered} registrerade · {overview.arrived} inne · {overview.remaining} kvar
          {!overview.doorPasswordSet ? ' · entrélösenord saknas' : ''}
        </p>
      )}
      <form className="card" onSubmit={onSubmit(async (event) => {
        const q = String(new FormData(event.currentTarget).get('q') || '');
        setQuery(q);
        await refresh(q);
      })}>
        <Field label="Namn, alias, e-post eller dörrkod"><input name="q" /></Field>
        <button className="btn" type="submit">Sök</button>
      </form>
      <ErrorText>{error}</ErrorText>
      {message && <p className="ok">{message}</p>}
      <div className="list" style={{ marginTop: '1rem' }}>
        {people.map((person) => (
          <article className="card person" key={person.id}>
            {person.photoToken ? <Portrait token={person.photoToken} alt="" /> : <div className="portrait empty" />}
            <div>
              <h2>{person.name}</h2>
              <p className="meta">{person.alias ? `${person.alias} · ` : ''}{person.email} · {person.doorCode}</p>
              <p className="meta">{person.invitedBy ? `Inbjuden av ${person.invitedBy}. ` : ''}{person.checkedInAt ? 'Inne.' : 'Inte anländ.'} {person.baseChipsIssued ? 'Marker utlämnade.' : ''} {person.inMystery ? 'Syns i mysteriet.' : ''}</p>
              <form onSubmit={onSubmit((event) => addCostume(event, person.id))}>
                <Field label="Bild i förklädnad">
                  <input name="costume" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required />
                </Field>
                <button className="btn small" type="submit">{person.inMystery ? 'Byt bilden i mysteriet' : 'Lägg i mysteriet'}</button>
              </form>
              {!person.checkedInAt && (
                <button className="btn small" type="button" onClick={() => void checkIn(person.id)}>
                  Har kommit · ge 100 i marker
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <form className="card" style={{ marginTop: '1rem' }} onSubmit={onSubmit(walkIn)}>
        <h2>Registrera en gäst utan telefon</h2>
        <p className="meta">Samma uppgifter som gästerna fyller i själva. Gästen loggar sedan in med förnamn och efternamn.</p>
        <Field label="Förnamn"><input name="firstName" required autoComplete="off" /></Field>
        <Field label="Efternamn"><input name="lastName" required autoComplete="off" /></Field>
        <Field label="Alias"><input name="alias" required maxLength={40} autoComplete="off" /></Field>
        <Field label="Medlemskap">
          <select name="membership" defaultValue="guest">
            <option value="guest">Gäst</option>
            <option value="sus">SUS</option>
            <option value="sas">SAS</option>
          </select>
        </Field>
        <Field label="Porträtt utan mask">
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required />
        </Field>
        <p className="meta">Ett äkta porträtt av ansiktet, utan mask eller förklädnad. Sök sedan fram gästen ovanför och lägg till bilden i utklädnad.</p>
        <button className="btn" type="submit">Spara registrering</button>
      </form>
    </Page>
  );
}
