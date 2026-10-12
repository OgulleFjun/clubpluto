import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Guard, Page, Portrait } from '../ui';

interface NameCard { nameToken: string; name: string; isVampire?: boolean; photoToken?: string }
interface PhotoCard { photoToken: string; name?: string; nameToken?: string; isVampire?: boolean }
interface Board {
  locked: boolean;
  message?: string;
  revealed: boolean;
  canGuess?: boolean;
  photos?: PhotoCard[];
  names?: NameCard[];
  identityGuesses?: { photoToken: string; nameToken: string; name: string; correct?: boolean }[];
  vampireGuesses?: { nameToken: string; suspects: boolean; correct?: boolean }[];
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
  const [mode, setMode] = useState<'identity' | 'vampire'>('identity');
  const [selected, setSelected] = useState<string | null>(null);

  function load() {
    return api<Board>('/club/mystery', {}, token).then(setBoard);
  }
  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function assign(photoToken: string) {
    if (!selected || !board?.canGuess) return;
    setError('');
    try {
      await api('/club/mystery/identity', {
        method: 'PUT',
        body: JSON.stringify({ photoToken, nameToken: selected }),
      }, token);
      setSelected(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gissningen sparades inte.');
    }
  }

  async function clearPhoto(photoToken: string) {
    if (!board?.canGuess) return;
    await api('/club/mystery/identity', {
      method: 'PUT',
      body: JSON.stringify({ photoToken, nameToken: null }),
    }, token);
    await load();
  }

  async function setVampire(nameToken: string, suspects: boolean | null) {
    if (!board?.canGuess) return;
    setError('');
    try {
      await api('/club/mystery/vampire', {
        method: 'PUT',
        body: JSON.stringify({ nameToken, suspects }),
      }, token);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gissningen sparades inte.');
    }
  }

  if (!board) return <Page title="Mysteriet">{error || 'Hämtar…'}</Page>;
  if (board.locked) return <Page title="Mysteriet" lede={board.message}><p>När arrangören öppnar tävlingen dyker porträtten och namnen upp här.</p></Page>;

  const guessFor = (photoToken: string) => board.identityGuesses?.find((guess) => guess.photoToken === photoToken);
  const usedNames = new Set(board.identityGuesses?.map((guess) => guess.nameToken));
  const vampireFor = (nameToken: string) => board.vampireGuesses?.find((guess) => guess.nameToken === nameToken);

  return (
    <Page
      title="Mysteriet"
      lede={board.revealed ? 'Facit är öppet.' : 'Välj ett namn och tryck på porträttet. Fel gissning kostar en poäng, en tom ruta kostar inget.'}
    >
      {board.score && (
        <p>Din poäng: {board.score.total} (identitet {board.score.identityPoints}, vampyrer {board.score.vampirePoints})
          {board.score.isWinner ? ' · överlevnadspriset' : ''}
        </p>
      )}
      <p className="meta">
        {board.identityGuesses?.length || 0} identitetsgissningar sparade · {board.vampireGuesses?.length || 0} vampyrgissningar sparade
      </p>
      <div className="segment">
        <button className={mode === 'identity' ? 'on' : ''} onClick={() => setMode('identity')} type="button">Vem är vem</button>
        <button className={mode === 'vampire' ? 'on' : ''} onClick={() => setMode('vampire')} type="button">Vampyrjakt</button>
      </div>
      <ErrorText>{error}</ErrorText>
      {mode === 'identity' ? (
        <>
          <div className="name-row">
            {board.names?.map((person) => (
              <button
                key={person.nameToken}
                type="button"
                className={`name-chip${selected === person.nameToken ? ' selected' : ''}`}
                onClick={() => setSelected(person.nameToken)}
                disabled={!board.canGuess}
              >
                {person.name}{usedNames.has(person.nameToken) ? ' · vald' : ''}
              </button>
            ))}
          </div>
          <div className="photo-grid">
            {board.photos?.map((photo) => {
              const guess = guessFor(photo.photoToken);
              return (
                <div key={photo.photoToken}>
                  <button type="button" className="photo-card" onClick={() => assign(photo.photoToken)} disabled={!board.canGuess}>
                    <Portrait token={photo.photoToken} alt={board.revealed ? photo.name || 'Porträtt' : 'Porträtt utan namn'} />
                  </button>
                  {guess && (
                    <p className="guess-label">
                      Din gissning: {guess.name}
                      {guess.correct !== undefined ? (guess.correct ? ' · rätt' : ' · fel') : ''}
                      {board.canGuess && (
                        <button className="text-button" type="button" onClick={() => clearPhoto(photo.photoToken)}> Ta bort</button>
                      )}
                    </p>
                  )}
                  {board.revealed && <p className="meta">Facit: {photo.name}{photo.isVampire ? ' · vampyr' : ''}</p>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="list">
          {board.names?.map((person) => {
            const guess = vampireFor(person.nameToken);
            return (
              <article className="card" key={person.nameToken}>
                <h2>{person.name}</h2>
                {board.revealed && <p className="meta">Facit: {person.isVampire ? 'vampyr' : 'människa'}</p>}
                <div className="actions">
                  <button className={`btn small${guess?.suspects === true ? '' : ' ghost'}`} type="button" disabled={!board.canGuess} onClick={() => setVampire(person.nameToken, true)}>Vampyr</button>
                  <button className={`btn small${guess?.suspects === false ? '' : ' ghost'}`} type="button" disabled={!board.canGuess} onClick={() => setVampire(person.nameToken, false)}>Människa</button>
                  <button className="btn small ghost" type="button" disabled={!board.canGuess} onClick={() => setVampire(person.nameToken, null)}>Vet inte</button>
                </div>
                {guess?.correct !== undefined && <p>{guess.correct ? 'Rätt' : 'Fel'}</p>}
              </article>
            );
          })}
        </div>
      )}
      {board.leaderboard && (
        <article className="card" style={{ marginTop: '1rem' }}>
          <h2>Slutresultat</h2>
          <table>
            <tbody>
              {board.leaderboard.map((row, index) => (
                <tr key={`${row.name}-${index}`}>
                  <td className={row.isWinner ? 'winner' : ''}>{row.isWinner ? '★ ' : ''}{row.name}{row.isYou ? ' (du)' : ''}</td>
                  <td>{row.total}</td>
                  <td>{row.isVampire ? 'vampyr' : 'människa'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}
    </Page>
  );
}
