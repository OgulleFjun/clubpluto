import { FormEvent, useEffect, useState } from 'react';
import { api, formatWhen } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Field, Guard, Page, Portrait, onSubmit } from '../ui';

type Tab = 'oversikt' | 'registrera' | 'deltagare' | 'inbjudningar' | 'tavling' | 'vampyrer' | 'priser' | 'personal' | 'kvallen';

const tabs: { id: Tab; label: string }[] = [
  { id: 'oversikt', label: 'Översikt' },
  { id: 'registrera', label: 'Registrera' },
  { id: 'deltagare', label: 'Deltagare' },
  { id: 'inbjudningar', label: 'Inbjudningar' },
  { id: 'tavling', label: 'Tävling' },
  { id: 'vampyrer', label: 'Vampyrer' },
  { id: 'priser', label: 'Priser' },
  { id: 'personal', label: 'Personal' },
  { id: 'kvallen', label: 'Kvällen' },
];

export default function Admin() {
  return (
    <Guard roles={['admin']}>
      <AdminInner />
    </Guard>
  );
}

function AdminInner() {
  const [tab, setTab] = useState<Tab>('oversikt');
  return (
    <Page title="Kontrollpanel" lede="Deltagare, gissningar, vampyrer och priser. Facit stannar här tills du avslöjar det.">
      <div className="tabs">
        {tabs.map((item) => (
          <button key={item.id} className={`btn small${tab === item.id ? '' : ' ghost'}`} type="button" onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'oversikt' && <Overview />}
      {tab === 'registrera' && <RegisterGuest />}
      {tab === 'deltagare' && <People />}
      {tab === 'inbjudningar' && <Invites />}
      {tab === 'tavling' && <Competition />}
      {tab === 'vampyrer' && <Vampires />}
      {tab === 'priser' && <PrizesAdmin />}
      {tab === 'personal' && <Staff />}
      {tab === 'kvallen' && <Settings />}
    </Page>
  );
}

function RegisterGuest() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<{ id: string; name: string; alias: string | null; email: string; registered: boolean }[]>([]);
  const [chosen, setChosen] = useState<{ id: string; name: string; alias: string | null; registered: boolean } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') || '').trim();
    setQuery(q);
    setChosen(null);
    setMessage('');
    setError('');
    try {
      const data = await api<{ people: typeof people }>(`/admin/register-search?q=${encodeURIComponent(q)}`, {}, token);
      setPeople(data.people);
      setSearched(true);
    } catch (reason) {
      setPeople([]);
      setSearched(true);
      setError(reason instanceof Error ? reason.message : 'Sökningen misslyckades.');
    }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    if (!chosen) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ name: string }>(`/admin/register-guest/${chosen.id}`, {
        method: 'POST',
        body: new FormData(event.currentTarget),
      }, token);
      setMessage(`${result.name} är registrerad. Bilden ligger i mysteriet.`);
      setChosen(null);
      setPeople([]);
      setSearched(false);
      setQuery('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registreringen misslyckades.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="register-kiosk">
      {!chosen && (
        <form className="card" onSubmit={search}>
          <h2>Hitta dig själv</h2>
          <Field label="Namn, e-post eller alias">
            <input name="q" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" required minLength={2} />
          </Field>
          <button className="btn" type="submit">Sök</button>
        </form>
      )}
      {!chosen && searched && people.length === 0 && !error && <p>Ingen träff. Prova namn, e-post eller alias.</p>}
      {!chosen && (
        <div className="list">
          {people.map((person) => (
            <button className="register-hit" key={person.id} type="button" onClick={() => { setChosen(person); setMessage(''); }}>
              <strong>{person.name}</strong>
              <span>{person.alias ? person.alias : person.email}</span>
              {person.registered && <small>Redan registrerad</small>}
            </button>
          ))}
        </div>
      )}
      {chosen && (
        <form className="card" onSubmit={onSubmit(register)}>
          <h2>{chosen.name}</h2>
          {chosen.alias && <p>{chosen.alias}</p>}
          <p>Ta ett foto på dig själv med masken på.</p>
          <Field label="Foto med mask">
            <input name="costume" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required />
          </Field>
          <button className="btn" type="submit" disabled={busy}>Registrera</button>
          <button className="btn ghost" type="button" onClick={() => setChosen(null)}>Tillbaka</button>
          <ErrorText>{error}</ErrorText>
        </form>
      )}
      {!chosen && <ErrorText>{error}</ErrorText>}
      {message && <p className="ok">{message}</p>}
    </div>
  );
}

function useAdmin<T>(path: string) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function reload() {
    const next = await api<T>(path, {}, token);
    setData(next);
    setError('');
    return next;
  }
  useEffect(() => {
    reload().catch((reason: Error) => setError(reason.message));
  }, [path, token]);
  return { token, data, error, setError, message, setMessage, reload };
}

function Overview() {
  const { data, error } = useAdmin<{
    registered: number; arrived: number; remaining: number; vampires: number; firstVampire: string | null;
    settings: { registrationOpen: boolean; identityOpen: boolean; vampireConversionsOpen: boolean; resultsRevealed: boolean; doorPasswordSet: boolean };
  }>('/admin/overview');
  if (!data) return <p>{error || 'Hämtar…'}</p>;
  const s = data.settings;
  return (
    <article className="card">
      <p>{data.registered} registrerade, {data.arrived} inne, {data.remaining} kvar.</p>
      <p>{data.vampires} vampyrer. Den Förste: {data.firstVampire || 'inte utsedd'}.</p>
      <p>
        Registrering {s.registrationOpen ? 'öppen' : 'stängd'}.
        Mysteriet {s.identityOpen ? 'öppet' : 'stängt'}.
        Förvandlingar {s.vampireConversionsOpen ? 'öppna' : 'stängda'}.
        Facit {s.resultsRevealed ? 'visas' : 'dolt'}.
        Entrélösenord {s.doorPasswordSet ? 'satt' : 'saknas'}.
      </p>
      <ErrorText>{error}</ErrorText>
    </article>
  );
}

interface Person {
  id: string; name: string; alias: string | null; email: string; membership: string;
  canInvite: boolean; checkedInAt: string | null; isVampire: boolean; isFirst: boolean;
  doorCode: string; baseChips: number; prizeChips: number; invitedBy: string | null; notes: string | null;
  conversionChips: number; sirePaid: boolean; turnedBy: string | null;
  photoToken: string | null; costumeToken: string | null;
}

function People() {
  const view = useAdmin<{ participants: Person[] }>('/admin/participants');
  const [selected, setSelected] = useState<Person | null>(null);
  if (!view.data) return <p>{view.error || 'Hämtar…'}</p>;
  const people = view.data.participants;
  return (
    <div className="list">
      <div className="list">
        {people.map((person) => (
          <button className="card" key={person.id} type="button" onClick={() => setSelected(person)} style={{ textAlign: 'left' }}>
            <strong>{person.name}</strong>
            <div className="meta">
              {person.membership === 'staff' ? 'Personal' : 'Medlem'} · {person.checkedInAt ? 'Inne' : 'Ute'} · {person.isVampire ? 'vampyr' : 'människa'}
              {person.isVampire ? ` · ${person.conversionChips} blodspengar från förvandling` : ''}
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <>
        <form className="card" key={selected.id} onSubmit={onSubmit(async (event) => {
          const form = new FormData(event.currentTarget);
          try {
            await api(`/admin/participants/${selected.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                name: form.get('name'),
                alias: form.get('alias'),
                email: form.get('email'),
                membership: form.get('membership'),
                canInvite: form.get('canInvite') === 'on',
                notes: form.get('notes'),
              }),
            }, view.token);
            view.setMessage('Sparat.');
            await view.reload();
          } catch (reason) {
            view.setError(reason instanceof Error ? reason.message : 'Kunde inte spara.');
          }
        })}>
          <h2>{selected.name}</h2>
          {(selected.costumeToken || selected.photoToken) && (
            <Portrait token={selected.costumeToken || selected.photoToken || ''} alt={selected.name} />
          )}
          <p className="meta">Dörrkod {selected.doorCode}. Inbjuden av {selected.invitedBy || 'arrangören'}. Spelmarker {selected.baseChips}, blodspengar {selected.prizeChips}.</p>
          <p>{selected.isVampire ? `Vampyr${selected.isFirst ? ', Den Förste' : ''}. ${selected.conversionChips} av 2 blodspengar från förvandlingar.${selected.turnedBy ? ` Förvandlad av ${selected.turnedBy}.` : ''}` : 'Människa.'}</p>
          <div className="actions">
            {selected.isVampire ? (
              <button className="btn small ghost" type="button" onClick={async () => {
                await api(`/admin/vampires/${selected.id}/revoke`, { method: 'POST' }, view.token);
                const next = await view.reload();
                setSelected(next.participants.find((person) => person.id === selected.id) || null);
              }}>Ta bort vampyr</button>
            ) : (
              <button className="btn small" type="button" onClick={async () => {
                await api('/admin/vampires', { method: 'POST', body: JSON.stringify({ participantId: selected.id }) }, view.token);
                const next = await view.reload();
                setSelected(next.participants.find((person) => person.id === selected.id) || null);
              }}>Gör till vampyr</button>
            )}
          </div>
          <Field label="Namn"><input name="name" defaultValue={selected.name} /></Field>
          <Field label="Alias"><input name="alias" defaultValue={selected.alias || ''} /></Field>
          <Field label="E-post"><input name="email" defaultValue={selected.email || ''} /></Field>
          <Field label="Medlemskap">
            <select name="membership" defaultValue={selected.membership}>
              <option value="sus">SUS</option>
              <option value="sas">SAS</option>
              <option value="guest">Gäst</option>
              <option value="staff">Personal</option>
            </select>
          </Field>
          <label className="meta"><input type="checkbox" name="canInvite" defaultChecked={selected.canInvite} /> Får bjuda in två gäster</label>
          <Field label="Anteckning"><textarea name="notes" defaultValue={selected.notes || ''} /></Field>
          <div className="actions">
            <button className="btn small" type="submit">Spara</button>
            <button className="btn small ghost" type="button" onClick={async () => {
              await api(`/admin/participants/${selected.id}/arrival`, { method: 'POST', body: JSON.stringify({ present: !selected.checkedInAt }) }, view.token);
              await view.reload();
            }}>{selected.checkedInAt ? 'Markera som ute' : 'Markera som inne'}</button>
          </div>
          <Field label="Nytt porträtt">
            <input type="file" accept="image/*" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const body = new FormData();
              body.set('photo', file);
              await api(`/admin/participants/${selected.id}/photo`, { method: 'POST', body }, view.token);
              view.setMessage('Porträttet är bytt.');
            }} />
          </Field>
          <ErrorText>{view.error}</ErrorText>
          {view.message && <p className="ok">{view.message}</p>}
        </form>
        <div className="card">
          <h3>Rätta spelmarker och blodspengar</h3>
          <Adjust personId={selected.id} />
          <button className="btn danger" type="button" onClick={async () => {
            const kind = selected.membership === 'staff' ? 'personalen' : 'medlemmen';
            if (!confirm(`Ta bort ${kind} ${selected.name} ur systemet?`)) return;
            await api(`/admin/participants/${selected.id}`, { method: 'DELETE' }, view.token);
            setSelected(null);
            await view.reload();
          }}>Ta bort ur systemet</button>
        </div>
        </>
      )}
    </div>
  );
}

function Adjust({ personId }: { personId: string }) {
  const { token } = useAuth();
  const [error, setError] = useState('');
  return (
    <form onSubmit={onSubmit(async (event) => {
      const form = new FormData(event.currentTarget);
      setError('');
      try {
        await api('/admin/adjustments', {
          method: 'POST',
          body: JSON.stringify({
            participantId: personId,
            baseDelta: Number(form.get('baseDelta') || 0),
            prizeDelta: Number(form.get('prizeDelta') || 0),
            reason: form.get('reason'),
          }),
        }, token);
        event.currentTarget.reset();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Rättningen misslyckades.');
      }
    })}>
      <Field label="Spelmarker, plus eller minus"><input name="baseDelta" type="number" defaultValue={0} /></Field>
      <Field label="Blodspengar, plus eller minus"><input name="prizeDelta" type="number" defaultValue={0} /></Field>
      <Field label="Varför"><input name="reason" required /></Field>
      <button className="btn small ghost" type="submit">Rätta</button>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}

function Invites() {
  const view = useAdmin<{ invitations: {
    id: string; token: string; label: string | null; kind: string; membership: string;
    inviterName: string | null; usedByName: string | null; usedAt: string | null; revokedAt: string | null;
  }[] }>('/admin/invitations');
  if (!view.data) return <p>{view.error || 'Hämtar…'}</p>;
  return (
    <>
      <form className="card" onSubmit={onSubmit(async (event) => {
        const form = new FormData(event.currentTarget);
        try {
          const created = await api<{ invitation: { token: string } }>('/admin/invitations', {
            method: 'POST',
            body: JSON.stringify({
              label: form.get('label'),
              membership: form.get('membership'),
              grantsInvite: form.get('grantsInvite') === 'on',
            }),
          }, view.token);
          view.setMessage(`${window.location.origin}/inbjudan/${created.invitation.token}`);
          event.currentTarget.reset();
          await view.reload();
        } catch (reason) {
          view.setError(reason instanceof Error ? reason.message : 'Kunde inte skapa inbjudan.');
        }
      })}>
        <h2>Arrangörsinbjudan</h2>
        <Field label="Minneslapp"><input name="label" /></Field>
        <Field label="Blir">
          <select name="membership" defaultValue="sus">
            <option value="sus">SUS-medlem</option>
            <option value="sas">SAS-medlem</option>
            <option value="guest">Gäst</option>
            <option value="staff">Personal</option>
          </select>
        </Field>
        <label className="meta"><input type="checkbox" name="grantsInvite" /> Får bjuda in två gäster</label>
        <button className="btn" type="submit">Skapa länk</button>
        {view.message && <p>{view.message}</p>}
        <ErrorText>{view.error}</ErrorText>
      </form>
      <div className="list" style={{ marginTop: '1rem' }}>
        {view.data.invitations.map((invite) => (
          <article className="card" key={invite.id}>
            <strong>{invite.label || 'Utan namn'}</strong>
            <p className="meta">{invite.kind} · {invite.membership} · av {invite.inviterName || 'arrangören'} · {invite.usedByName ? `använd av ${invite.usedByName}` : invite.revokedAt ? 'tillbakadragen' : 'ledig'}</p>
            {!invite.usedAt && !invite.revokedAt && (
              <button className="btn small ghost" type="button" onClick={async () => {
                await api(`/admin/invitations/${invite.id}/revoke`, { method: 'POST' }, view.token);
                await view.reload();
              }}>Dra tillbaka</button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function Competition() {
  const { token } = useAuth();
  const scores = useAdmin<{ rows: {
    id: string; name: string; total: number; identityPoints: number; vampirePoints: number;
    isVampire: boolean; isWinner: boolean; tiedForLead: boolean;
  }[]; tieBreak: string; revealed: boolean }>('/admin/scores');
  const [guessesOpen, setGuessesOpen] = useState(false);
  const [guessers, setGuessers] = useState<{ name: string; identity: { photoName: string; guessedName: string; correct: boolean }[]; vampire: { name: string; suspects: boolean; correct: boolean }[] }[]>([]);
  async function act(path: string) {
    await api(path, { method: 'POST' }, token);
    await scores.reload();
  }
  if (!scores.data) return <p>{scores.error || 'Räknar…'}</p>;
  return (
    <>
      <p className="meta">Listan räknas live och syns inte för deltagarna förrän du avslöjar facit. Lika poäng: {scores.data.tieBreak}.</p>
      <div className="actions">
        <button className="btn small" type="button" onClick={() => act('/admin/competition/close')}>Stäng tävlingen</button>
        <button className="btn small" type="button" onClick={() => act('/admin/competition/reveal')}>Avslöja facit</button>
        <button className="btn small ghost" type="button" onClick={() => act('/admin/competition/hide')}>Dölj facit</button>
        <button className="btn small ghost" type="button" onClick={() => act('/admin/competition/recompute')}>Räkna om</button>
      </div>
      <ErrorText>{scores.error}</ErrorText>
      <table>
        <thead><tr><th>Namn</th><th>Totalt</th><th>Identitet</th><th>Vampyr</th><th></th></tr></thead>
        <tbody>
          {scores.data.rows.map((row) => (
            <tr key={row.id}>
              <td className={row.isWinner ? 'winner' : ''}>{row.name}</td>
              <td>{row.total}</td>
              <td>{row.identityPoints}</td>
              <td>{row.vampirePoints}</td>
              <td>
                {row.isVampire ? 'vampyr' : 'människa'}
                {row.tiedForLead && !row.isWinner && (
                  <button className="btn small" type="button" onClick={async () => {
                    await api('/admin/competition/winner', { method: 'POST', body: JSON.stringify({ participantId: row.id }) }, token);
                    await scores.reload();
                  }}>Utse</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn ghost" type="button" onClick={async () => {
        const data = await api<{ guessers: typeof guessers }>('/admin/guesses', {}, token);
        setGuessers(data.guessers);
        setGuessesOpen(true);
      }}>Visa alla gissningar</button>
      {guessesOpen && guessers.map((person) => (
        <article className="card" key={person.name}>
          <h2>{person.name}</h2>
          {person.identity.map((guess, index) => (
            <p key={index} className="meta">{guess.photoName} gissades som {guess.guessedName} · {guess.correct ? 'rätt' : 'fel'}</p>
          ))}
          {person.vampire.map((guess, index) => (
            <p key={index} className="meta">{guess.name}: {guess.suspects ? 'vampyr' : 'människa'} · {guess.correct ? 'rätt' : 'fel'}</p>
          ))}
        </article>
      ))}
    </>
  );
}

function Vampires() {
  const people = useAdmin<{ participants: Person[] }>('/admin/participants');
  const [pool, setPool] = useState('checked_in');
  if (!people.data) return <p>{people.error || 'Hämtar…'}</p>;
  const vampires = people.data.participants.filter((person) => person.isVampire);
  const humans = people.data.participants.filter((person) => !person.isVampire);
  return (
    <>
      <form className="card" onSubmit={onSubmit(async () => {
        try {
          const result = await api<{ name: string; bonusGranted: boolean }>('/admin/vampires/first', {
            method: 'POST',
            body: JSON.stringify({ pool }),
          }, people.token);
          people.setMessage(`${result.name} är Den Förste.${result.bonusGranted ? ' Bonusen är given.' : ' Ingen startbonus.'}`);
          await people.reload();
        } catch (reason) {
          people.setError(reason instanceof Error ? reason.message : 'Kunde inte välja.');
        }
      })}>
        <h2>Den Förste</h2>
        <Field label="Välj bland">
          <select value={pool} onChange={(event) => setPool(event.target.value)}>
            <option value="checked_in">Incheckade</option>
            <option value="registered">Alla registrerade</option>
          </select>
        </Field>
        <button className="btn" type="submit">Slumpa</button>
      </form>
      <form className="card" onSubmit={onSubmit(async (event) => {
        const form = new FormData(event.currentTarget);
        try {
          await api('/admin/vampires', {
            method: 'POST',
            body: JSON.stringify({
              participantId: form.get('participantId'),
              turnedById: form.get('turnedById') || null,
            }),
          }, people.token);
          people.setMessage('Förvandlingen är registrerad. Bonusen ges bara en gång.');
          await people.reload();
        } catch (reason) {
          people.setError(reason instanceof Error ? reason.message : 'Förvandlingen sparades inte.');
        }
      })}>
        <h2>Banken: ny vampyr</h2>
        <Field label="Vem blev förvandlad">
          <select name="participantId" required>
            {humans.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
        <Field label="Förvandlad av">
          <select name="turnedById">
            <option value="">Okänt / Den Förste</option>
            {vampires.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
        <button className="btn" type="submit">Registrera</button>
      </form>
      <ErrorText>{people.error}</ErrorText>
      {people.message && <p className="ok">{people.message}</p>}
      <div className="list">
        {vampires.map((person) => (
          <article className="card" key={person.id}>
            <strong>{person.name}</strong> {person.isFirst ? '· Den Förste' : ''}
            <div className="actions">
              <button className="btn small ghost" type="button" onClick={async () => {
                await api(`/admin/vampires/${person.id}/bonus`, { method: 'POST' }, people.token);
                await people.reload();
              }}>Ge bonus om den saknas</button>
              <button className="btn small danger" type="button" onClick={async () => {
                await api(`/admin/vampires/${person.id}/revoke`, { method: 'POST' }, people.token);
                await people.reload();
              }}>Ta bort status</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function PrizesAdmin() {
  const view = useAdmin<{ prizes: { id: string; name: string; description: string; cost: number; stock: number; active: boolean }[]; redemptions: { id: string; participant_name: string; prize_name: string; quantity: number; cost: number }[] }>('/admin/prizes');
  const people = useAdmin<{ participants: Person[] }>('/admin/participants');
  if (!view.data || !people.data) return <p>Hämtar priser…</p>;
  return (
    <>
      <form className="card" onSubmit={onSubmit(async (event) => {
        const form = new FormData(event.currentTarget);
        await api('/admin/prizes', {
          method: 'POST',
          body: JSON.stringify({
            name: form.get('name'),
            description: form.get('description'),
            cost: Number(form.get('cost')),
            stock: Number(form.get('stock')),
          }),
        }, view.token);
        event.currentTarget.reset();
        await view.reload();
      })}>
        <h2>Nytt pris</h2>
        <Field label="Namn"><input name="name" required /></Field>
        <Field label="Beskrivning"><textarea name="description" /></Field>
        <Field label="Blodspengar, minst 2"><input name="cost" type="number" min={2} defaultValue={2} /></Field>
        <Field label="Antal"><input name="stock" type="number" min={0} defaultValue={1} /></Field>
        <button className="btn" type="submit">Lägg till</button>
      </form>
      {view.data.prizes.map((prize) => (
        <article className="card" key={prize.id}>
          <h2>{prize.name}</h2>
          <form onSubmit={onSubmit(async (event) => {
            const form = new FormData(event.currentTarget);
            await api(`/admin/prizes/${prize.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                name: form.get('name'),
                description: form.get('description'),
                cost: Number(form.get('cost')),
                stock: Number(form.get('stock')),
                active: form.get('active') === 'on',
              }),
            }, view.token);
            await view.reload();
          })}>
            <Field label="Namn"><input name="name" defaultValue={prize.name} /></Field>
            <Field label="Beskrivning"><textarea name="description" defaultValue={prize.description} /></Field>
            <Field label="Kostnad"><input name="cost" type="number" min={2} defaultValue={prize.cost} /></Field>
            <Field label="Kvar"><input name="stock" type="number" min={0} defaultValue={prize.stock} /></Field>
            <label className="meta"><input type="checkbox" name="active" defaultChecked={prize.active} /> Syns i butiken</label>
            <button className="btn small" type="submit">Spara pris</button>
          </form>
          <Field label="Bild">
            <input type="file" accept="image/*" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const body = new FormData();
              body.set('photo', file);
              await api(`/admin/prizes/${prize.id}/image`, { method: 'POST', body }, view.token);
              await view.reload();
            }} />
          </Field>
        </article>
      ))}
      <form className="card" onSubmit={onSubmit(async (event) => {
        const form = new FormData(event.currentTarget);
        try {
          await api('/admin/redemptions', {
            method: 'POST',
            body: JSON.stringify({
              prizeId: form.get('prizeId'),
              participantId: form.get('participantId'),
              quantity: Number(form.get('quantity') || 1),
              force: form.get('force') === 'on',
            }),
          }, view.token);
          await view.reload();
        } catch (reason) {
          view.setError(reason instanceof Error ? reason.message : 'Utlämningen sparades inte.');
        }
      })}>
        <h2>Lämna ut pris</h2>
        <Field label="Pris">
          <select name="prizeId">{view.data.prizes.map((prize) => <option key={prize.id} value={prize.id}>{prize.name}</option>)}</select>
        </Field>
        <Field label="Deltagare">
          <select name="participantId">{people.data.participants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
        </Field>
        <Field label="Antal"><input name="quantity" type="number" min={1} defaultValue={1} /></Field>
        <label className="meta"><input type="checkbox" name="force" /> Spara även om de registrerade blodspengarna inte räcker</label>
        <button className="btn" type="submit">Registrera utlämning</button>
        <ErrorText>{view.error}</ErrorText>
      </form>
      {view.data.redemptions.map((row) => (
        <p key={row.id}>{row.participant_name} fick {row.quantity} × {row.prize_name}
          <button className="text-button" type="button" onClick={async () => {
            await api(`/admin/redemptions/${row.id}`, { method: 'DELETE' }, view.token);
            await view.reload();
          }}> Ångra</button>
        </p>
      ))}
    </>
  );
}

function Staff() {
  const view = useAdmin<{ staff: { id: string; email: string; role: string; active: boolean; gameKeys: string[] }[]; games: { key: string; name: string }[] }>('/admin/staff');
  if (!view.data) return <p>{view.error || 'Hämtar…'}</p>;
  return (
    <>
      <form className="card" onSubmit={onSubmit(async (event) => {
        const form = new FormData(event.currentTarget);
        await api('/admin/staff', {
          method: 'POST',
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
            role: form.get('role'),
            gameKeys: form.getAll('gameKeys'),
          }),
        }, view.token);
        event.currentTarget.reset();
        await view.reload();
      })}>
        <h2>Nytt konto</h2>
        <Field label="E-post"><input name="email" type="email" required /></Field>
        <Field label="Lösenord"><input name="password" type="password" minLength={8} required /></Field>
        <Field label="Roll">
          <select name="role"><option value="gamemaster">Spelledare</option><option value="doorman">Dörrvakt</option></select>
        </Field>
        {view.data.games.map((game) => (
          <label key={game.key} className="meta"><input type="checkbox" name="gameKeys" value={game.key} /> {game.name}</label>
        ))}
        <button className="btn" type="submit">Skapa</button>
      </form>
      {view.data.staff.map((account) => (
        <article className="card" key={account.id}>
          <strong>{account.email}</strong>
          <p className="meta">{account.role} · {account.active ? 'aktiv' : 'avstängd'}</p>
          {account.role === 'gamemaster' && (
            <form onSubmit={onSubmit(async (event) => {
              const form = new FormData(event.currentTarget);
              await api(`/admin/staff/${account.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ gameKeys: form.getAll('gameKeys') }),
              }, view.token);
              await view.reload();
            })}>
              {view.data?.games.map((game) => (
                <label key={game.key} className="meta">
                  <input type="checkbox" name="gameKeys" value={game.key} defaultChecked={account.gameKeys.includes(game.key)} /> {game.name}
                </label>
              ))}
              <button className="btn small" type="submit">Spara spel</button>
            </form>
          )}
          <button className="btn small ghost" type="button" onClick={async () => {
            await api(`/admin/staff/${account.id}`, { method: 'PATCH', body: JSON.stringify({ active: !account.active }) }, view.token);
            await view.reload();
          }}>{account.active ? 'Stäng av' : 'Aktivera'}</button>
        </article>
      ))}
    </>
  );
}

function dateTimeLocal(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Settings() {
  const view = useAdmin<{ settings: {
    clubName: string; tagline: string; eventStartsAt: string; location: string; publicIntro: string; rulesText: string;
    registrationOpen: boolean; identityOpen: boolean; vampireConversionsOpen: boolean; useAliases: boolean;
    firstVampireGetsBonus: boolean; tieBreak: string; doorPasswordSet: boolean;
  } }>('/admin/overview');
  const [games, setGames] = useState<{ key: string; name: string; summary: string; rules: string }[]>([]);
  const { token } = useAuth();
  useEffect(() => {
    api<{ games: { key: string; name: string; summary: string; rules: string }[] }>('/public/event').then((data) => setGames(data.games));
  }, []);
  if (!view.data) return <p>{view.error || 'Hämtar…'}</p>;
  const s = view.data.settings;
  const local = dateTimeLocal(s.eventStartsAt);
  return (
    <form className="card" onSubmit={onSubmit(async (event) => {
      const form = new FormData(event.currentTarget);
      await api('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          clubName: form.get('clubName'),
          tagline: form.get('tagline'),
          eventStartsAt: new Date(String(form.get('eventStartsAt'))).toISOString(),
          location: form.get('location'),
          publicIntro: form.get('publicIntro'),
          rulesText: form.get('rulesText'),
          registrationOpen: form.get('registrationOpen') === 'on',
          identityOpen: form.get('identityOpen') === 'on',
          vampireConversionsOpen: form.get('vampireConversionsOpen') === 'on',
          useAliases: form.get('useAliases') === 'on',
          firstVampireGetsBonus: form.get('firstVampireGetsBonus') === 'on',
          tieBreak: form.get('tieBreak'),
          games: games.map((game) => ({
            key: game.key,
            name: form.get(`name-${game.key}`),
            summary: form.get(`summary-${game.key}`),
            rules: form.get(`rules-${game.key}`),
          })),
        }),
      }, token);
      const password = String(form.get('doorPassword') || '');
      if (password) await api('/admin/door-password', { method: 'POST', body: JSON.stringify({ password }) }, token);
      view.setMessage('Kvällen är uppdaterad.');
      await view.reload();
    })}>
      <Field label="Klubbnamn"><input name="clubName" defaultValue={s.clubName} /></Field>
      <Field label="Underrad"><input name="tagline" defaultValue={s.tagline} /></Field>
      <Field label="Tid"><input name="eventStartsAt" type="datetime-local" defaultValue={local} /></Field>
      <Field label="Plats"><input name="location" defaultValue={s.location} /></Field>
      <Field label="Ingress"><textarea name="publicIntro" defaultValue={s.publicIntro} /></Field>
      <Field label="Regler"><textarea name="rulesText" defaultValue={s.rulesText} /></Field>
      <label className="meta"><input type="checkbox" name="registrationOpen" defaultChecked={s.registrationOpen} /> Registrering öppen</label>
      <label className="meta"><input type="checkbox" name="identityOpen" defaultChecked={s.identityOpen} /> Mysteriet och gissningarna öppna</label>
      <label className="meta"><input type="checkbox" name="vampireConversionsOpen" defaultChecked={s.vampireConversionsOpen} /> Banken tar emot förvandlingar</label>
      <label className="meta"><input type="checkbox" name="useAliases" defaultChecked={s.useAliases} /> Alias visas på den egna sidan</label>
      <label className="meta"><input type="checkbox" name="firstVampireGetsBonus" defaultChecked={s.firstVampireGetsBonus} /> Den Förste får 20 spelmarker och 1 blodspeng direkt</label>
      <Field label="Lika poäng">
        <select name="tieBreak" defaultValue={s.tieBreak}>
          <option value="shared">Dela priset</option>
          <option value="earliest">Tidigaste färdiga gissningen</option>
          <option value="manual">Arrangören väljer</option>
        </select>
      </Field>
      <Field label={s.doorPasswordSet ? 'Nytt entrélösenord' : 'Entrélösenord'}>
        <input name="doorPassword" placeholder="Lämna tomt om det ska vara kvar" />
      </Field>
      {games.map((game) => (
        <fieldset key={game.key}>
          <Field label={`${game.name}: namn`}><input name={`name-${game.key}`} defaultValue={game.name} /></Field>
          <Field label="Kort text"><input name={`summary-${game.key}`} defaultValue={game.summary} /></Field>
          <Field label="Regler"><textarea name={`rules-${game.key}`} defaultValue={game.rules} /></Field>
        </fieldset>
      ))}
      <button className="btn" type="submit">Spara kvällen</button>
      {view.message && <p className="ok">{view.message}</p>}
      <p className="meta">Nu: {formatWhen(s.eventStartsAt)}</p>
    </form>
  );
}
