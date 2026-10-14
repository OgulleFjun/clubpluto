import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Guard, Portrait } from '../ui';

interface IdentityCard {
  nameToken: string;
  name: string;
  photoToken: string | null;
  isVampire?: boolean;
}
interface CostumeCard {
  costumeToken: string;
  name?: string;
  isVampire?: boolean;
}
interface Board {
  locked: boolean;
  revealed: boolean;
  canGuess?: boolean;
  costumes?: CostumeCard[];
  identities?: IdentityCard[];
  identityGuesses?: { costumeToken: string; nameToken: string; name: string; correct?: boolean }[];
  vampireGuesses?: { costumeToken: string; suspects: boolean; correct?: boolean }[];
  score?: { total: number; identityPoints: number; vampirePoints: number; isWinner: boolean } | null;
  leaderboard?: { name: string; total: number; isVampire: boolean; isWinner: boolean; isYou: boolean }[];
}

export default function Mystery() {
  return (
    <Guard roles={['participant']}>
      <MysteryInner />
    </Guard>
  );
}

function MysteryInner() {
  const { token } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [matching, setMatching] = useState<string | null>(null);
  const [vampireAsk, setVampireAsk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    return api<Board>('/club/mystery', {}, token).then(setBoard);
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
    const timer = window.setInterval(() => {
      load().catch(() => {});
    }, 12000);
    return () => window.clearInterval(timer);
  }, [token]);

  async function match(nameToken: string) {
    if (!matching || !board?.canGuess) return;
    setBusy(true);
    setError('');
    try {
      await api('/club/mystery/identity', {
        method: 'PUT',
        body: JSON.stringify({ costumeToken: matching, nameToken }),
      }, token);
      setMatching(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Matchningen sparades inte.');
    } finally {
      setBusy(false);
    }
  }

  async function accuse(costumeToken: string) {
    if (!board?.canGuess) return;
    setBusy(true);
    setError('');
    try {
      await api('/club/mystery/vampire', {
        method: 'PUT',
        body: JSON.stringify({ costumeToken }),
      }, token);
      setVampireAsk(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Vampyrgissningen sparades inte.');
    } finally {
      setBusy(false);
    }
  }

  if (!board) return <section className="page mystery-page">{error || 'Hämtar mysteriet…'}</section>;
  const costumes = board.costumes || [];
  const guessFor = (costumeToken: string) => board.identityGuesses?.find((guess) => guess.costumeToken === costumeToken);
  const vampireFor = (costumeToken: string) => board.vampireGuesses?.find((guess) => guess.costumeToken === costumeToken);
  const usedNames = new Set(board.identityGuesses?.map((guess) => guess.nameToken));

  return (
    <section className="page mystery-page">
      <h1>Mysteriet</h1>
      <p className="lede">
        {board.canGuess
          ? 'Svep mellan förklädnaderna. Vampyr går inte att ångra.'
          : 'Bilderna dyker upp när Managern registrerar gästerna. Gissningar öppnar när mysteriet är igång.'}
      </p>
      {board.score && (
        <p>Din poäng: {board.score.total}{board.score.isWinner ? ' · överlevnadspriset' : ''}</p>
      )}
      <ErrorText>{error}</ErrorText>
      {costumes.length === 0 ? (
        <p>Inga förklädnader ännu.</p>
      ) : (
        <>
          <p className="meta mystery-count">{index + 1} / {costumes.length}</p>
          <div
            className="mystery-scroll"
            onScroll={(event) => {
              const node = event.currentTarget;
              const next = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1));
              setIndex(Math.min(costumes.length - 1, Math.max(0, next)));
            }}
          >
            {costumes.map((costume) => {
              const guess = guessFor(costume.costumeToken);
              const vampire = vampireFor(costume.costumeToken);
              return (
                <article className="mystery-slide" key={costume.costumeToken}>
                  <Portrait token={costume.costumeToken} alt={board.revealed ? costume.name || 'Förklädnad' : 'Förklädnad'} />
                  {guess && (
                    <p className="guess-label">
                      Matchad med {guess.name}
                      {guess.correct !== undefined ? (guess.correct ? ' · rätt' : ' · fel') : ''}
                    </p>
                  )}
                  {vampire && <p className="meta">Vampyrgissning sparad{vampire.correct !== undefined ? (vampire.correct ? ' · rätt' : ' · fel') : ''}.</p>}
                  {board.revealed && <p className="meta">Facit: {costume.name}{costume.isVampire ? ' · vampyr' : ''}</p>}
                  <div className="mystery-actions">
                    <button
                      className="btn"
                      type="button"
                      disabled={!board.canGuess || busy || Boolean(vampire)}
                      onClick={() => setVampireAsk(costume.costumeToken)}
                    >
                      Vampyr
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={!board.canGuess || busy}
                      onClick={() => setMatching(costume.costumeToken)}
                    >
                      Matcha
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      {matching && (
        <div className="match-sheet" role="dialog" aria-modal="true" aria-labelledby="match-title">
          <div className="match-bar">
            <h2 id="match-title">Vem är personen?</h2>
            <button className="btn small ghost" type="button" onClick={() => setMatching(null)}>Stäng</button>
          </div>
          <div className="match-scroll">
            {board.identities?.map((person) => (
              <button
                className="match-card"
                type="button"
                key={person.nameToken}
                disabled={busy}
                onClick={() => match(person.nameToken)}
              >
                {person.photoToken
                  ? <Portrait token={person.photoToken} alt={person.name} />
                  : <div className="portrait empty" />}
                <span>{person.name}{usedNames.has(person.nameToken) ? ' · redan matchad' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {vampireAsk && (
        <div className="match-sheet confirm-sheet" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <h2>Är du säker?</h2>
            <p>En vampyrgissning går inte att ändra.</p>
            <button className="btn" type="button" disabled={busy} onClick={() => accuse(vampireAsk)}>Ja, personen är en vampyr</button>
            <button className="btn ghost" type="button" disabled={busy} onClick={() => setVampireAsk(null)}>Avbryt</button>
          </div>
        </div>
      )}
      {board.leaderboard && (
        <article className="card">
          <h2>Slutresultat</h2>
          <table>
            <tbody>
              {board.leaderboard.map((row, rowIndex) => (
                <tr key={`${row.name}-${rowIndex}`}>
                  <td className={row.isWinner ? 'winner' : ''}>{row.isWinner ? '★ ' : ''}{row.name}{row.isYou ? ' (du)' : ''}</td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}
    </section>
  );
}
