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
  invitedBy: string | null;
}

const roles = ['admin', 'doorman'];

export default function Door() {
  return (
    <Guard roles={roles}>
      <DoorInner />
    </Guard>
  );
}

function DoorInner() {
  const { token, user } = useAuth();
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

  async function checkIn(event: FormEvent<HTMLFormElement>, id: string) {
    const form = new FormData(event.currentTarget);
    setError('');
    setMessage('');
    try {
      await api(`/door/check-in/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          doorPassword: form.get('doorPassword'),
          skipPassword: form.get('skipPassword') === 'on',
        }),
      }, token);
      setMessage('Incheckad. 100 basmarker är markerade.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Incheckningen misslyckades.');
    }
  }

  async function walkIn(event: FormEvent<HTMLFormElement>) {
    setError('');
    try {
      await api('/door/register', { method: 'POST', body: new FormData(event.currentTarget) }, token);
      event.currentTarget.reset();
      setMessage('Deltagaren är registrerad. Checka in personen när lösenordet är sagt.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registreringen misslyckades.');
    }
  }

  return (
    <Page title="Dörren" lede="Sök fram gästen, be om lösenordet och lämna ut 100 basmarker.">
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
              <p className="meta">{person.invitedBy ? `Inbjuden av ${person.invitedBy}. ` : ''}{person.checkedInAt ? 'Inne.' : 'Inte anländ.'} {person.baseChipsIssued ? 'Marker utlämnade.' : ''}</p>
              {!person.checkedInAt && (
                <form onSubmit={onSubmit((event) => checkIn(event, person.id))}>
                  <Field label="Entrélösenord som gästen säger"><input name="doorPassword" /></Field>
                  {user?.role === 'admin' && (
                    <label className="meta"><input type="checkbox" name="skipPassword" /> Hoppa över lösenordet den här gången</label>
                  )}
                  <button className="btn small" type="submit">Checka in och ge 100 basmarker</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
      <form className="card" style={{ marginTop: '1rem' }} onSubmit={onSubmit(walkIn)}>
        <h2>Registrera i dörren</h2>
        <Field label="Namn"><input name="name" required /></Field>
        <Field label="Alias"><input name="alias" /></Field>
        <Field label="E-post"><input name="email" type="email" required /></Field>
        <Field label="Tillfälligt lösenord"><input name="password" type="password" minLength={8} required /></Field>
        <Field label="Medlemskap">
          <select name="membership" defaultValue="guest">
            <option value="guest">Gäst</option>
            <option value="sus">SUS</option>
            <option value="sas">SAS</option>
            <option value="staff">Personal</option>
          </select>
        </Field>
        <label className="meta"><input type="checkbox" name="canInvite" value="true" /> Får bjuda in två gäster (inte för vanliga gäster)</label>
        <Field label="Porträtt"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></Field>
        <button className="btn" type="submit">Spara registrering</button>
      </form>
    </Page>
  );
}
