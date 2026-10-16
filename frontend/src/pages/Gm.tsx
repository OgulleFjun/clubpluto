import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Field, Guard, Page, onSubmit } from '../ui';

interface Game { key: string; name: string; summary: string; rules: string }
interface Person { id: string; name: string; alias: string | null; checkedInAt: string | null; prizeChips: number; doorCode: string }
interface Result {
  id: string;
  game_name: string;
  participant_name: string;
  prize_chips: number;
  note: string | null;
  voided: boolean;
  created_at: string;
}

const roles = ['gamemaster', 'admin'];

export default function Gm() {
  return (
    <Guard roles={roles}>
      <GmInner />
    </Guard>
  );
}

function GmInner() {
  const { token } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadHome() {
    const data = await api<{ games: Game[]; results: Result[] }>('/gm/home', {}, token);
    setGames(data.games);
    setResults(data.results);
  }
  useEffect(() => {
    loadHome().catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function search(event: FormEvent<HTMLFormElement>) {
    const q = String(new FormData(event.currentTarget).get('q') || '');
    const data = await api<{ participants: Person[] }>(`/gm/participants?q=${encodeURIComponent(q)}`, {}, token);
    setPeople(data.participants);
  }

  async function record(event: FormEvent<HTMLFormElement>, participantId: string) {
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      await api('/gm/results', {
        method: 'POST',
        body: JSON.stringify({
          gameKey: form.get('gameKey'),
          participantId,
          prizeChips: Number(form.get('prizeChips')),
          note: form.get('note'),
        }),
      }, token);
      setMessage('Prismarkerna är registrerade.');
      await loadHome();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registreringen misslyckades.');
    }
  }

  async function voidResult(id: string) {
    await api(`/gm/results/${id}`, { method: 'PATCH', body: JSON.stringify({ voided: true }) }, token);
    await loadHome();
  }

  return (
    <Page title="Spelledare" lede="Skriv upp prismarker. Spelmarkerna i potten stannar på bordet.">
      {games.length === 0 && <p>Du har inget spel tilldelat ännu. Be administratören koppla ditt konto.</p>}
      <div className="grid">
        {games.map((game) => (
          <article className="card" key={game.key}>
            <h2>{game.name}</h2>
            <p className="prose">{game.rules}</p>
          </article>
        ))}
      </div>
      <form className="card" onSubmit={onSubmit(search)}>
        <Field label="Sök deltagare på namn eller dörrkod"><input name="q" /></Field>
        <button className="btn" type="submit">Sök</button>
      </form>
      <ErrorText>{error}</ErrorText>
      {message && <p className="ok">{message}</p>}
      <div className="list">
        {people.map((person) => (
          <article className="card" key={person.id}>
            <h2>{person.name}</h2>
            <p className="meta">{person.checkedInAt ? 'Incheckad' : 'Inte incheckad'} · {person.prizeChips} registrerade prismarker · {person.doorCode}</p>
            <form onSubmit={onSubmit((event) => record(event, person.id))}>
              <Field label="Spel">
                <select name="gameKey" required>
                  {games.map((game) => <option key={game.key} value={game.key}>{game.name}</option>)}
                </select>
              </Field>
              <Field label="Prismarker"><input name="prizeChips" type="number" min={0} max={50} defaultValue={1} required /></Field>
              <Field label="Anteckning"><input name="note" /></Field>
              <button className="btn small" type="submit">Registrera</button>
            </form>
          </article>
        ))}
      </div>
      <h2>Dina registreringar</h2>
      <div className="list">
        {results.map((result) => (
          <article className="card" key={result.id}>
            <strong>{result.participant_name}</strong> · {result.game_name} · {result.prize_chips} prismarker
            {result.voided ? ' · makulerad' : ''}
            <p className="meta">{result.note}</p>
            {!result.voided && <button className="btn small danger" type="button" onClick={() => voidResult(result.id)}>Makulera</button>}
          </article>
        ))}
      </div>
    </Page>
  );
}
