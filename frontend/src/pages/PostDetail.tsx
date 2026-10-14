import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { postCopy, primaryPostKeys, prizeRules, staffPosts, vampireRules, welcomeCopy, whenWhere } from '../posts';
import { ErrorText, Guard, Portrait } from '../ui';

type Tab = 'allmant' | 'kvall' | 'uppgift' | 'spel' | 'vampyr' | 'priser' | 'poang';

const tabs: { id: Tab; label: string }[] = [
  { id: 'allmant', label: 'Allmänt' },
  { id: 'kvall', label: 'Kvällen' },
  { id: 'uppgift', label: 'Uppgift' },
  { id: 'spel', label: 'Spel' },
  { id: 'vampyr', label: 'Vampyr' },
  { id: 'priser', label: 'Priser' },
];

interface Board {
  mine: string | null;
  posts: { key: string; taken: boolean; mine: boolean }[];
}

function VampireDesk({ token }: { token: string | null }) {
  const [desk, setDesk] = useState<{
    newbie: { id: string; name: string } | null;
    pictures: { id: string; name: string; imageToken: string | null; conversionChips: number }[];
    vampires: { id: string; name: string; conversionChips: number; isFirst: boolean }[];
  } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    return api<NonNullable<typeof desk>>('/posts/manager/vampires', {}, token).then((next) => {
      setDesk(next);
      setPicked(null);
    });
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function pay() {
    if (!desk?.newbie || !picked) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ sireName: string; conversionChips: number }>('/posts/manager/vampires/credit', {
        method: 'POST',
        body: JSON.stringify({ newbieId: desk.newbie.id, sireId: picked }),
      }, token);
      setMessage(`${result.sireName} har nu ${result.conversionChips} vinstmarker från förvandlingar.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Vinstmarken gavs inte.');
    } finally {
      setBusy(false);
    }
  }

  if (!desk) return <p>{error || 'Hämtar vampyrerna…'}</p>;
  return (
    <div className="list" style={{ marginBottom: '1rem' }}>
      <article className="card">
        <h2>De två senaste</h2>
        {desk.newbie ? (
          <p>{desk.newbie.name} är ny vampyr. Be personen peka på vem som förvandlade den.</p>
        ) : (
          <p>Ingen ny vampyr väntar på att peka ut sin förvandlare.</p>
        )}
        <div className="sire-row">
          {desk.pictures.map((person) => (
            <button
              key={person.id}
              type="button"
              className={`sire-card${picked === person.id ? ' picked' : ''}`}
              onClick={() => setPicked(person.id)}
            >
              {person.imageToken ? <Portrait token={person.imageToken} alt={person.name} /> : <div className="portrait empty" />}
              <span>{person.name}</span>
              <small>{person.conversionChips} / 2 vinstmarker</small>
            </button>
          ))}
        </div>
        {desk.pictures.length === 0 && <p className="meta">Det finns inga tidigare vampyrer att peka på ännu.</p>}
        <button className="btn" type="button" disabled={!desk.newbie || !picked || busy} onClick={pay}>
          Ge den gamla vampyren en vinstmark
        </button>
        {message && <p className="ok">{message}</p>}
        <ErrorText>{error}</ErrorText>
      </article>
      {desk.vampires.length > 0 && (
        <article className="card">
          <h2>Vinstmarker från förvandling</h2>
          {desk.vampires.map((person) => (
            <p key={person.id}>{person.name}{person.isFirst ? ', Den Förste' : ''}: {person.conversionChips} av 2</p>
          ))}
        </article>
      )}
    </div>
  );
}

export default function PostDetail() {
  return (
    <Guard roles={['admin', 'doorman', 'gamemaster']}>
      <Detail />
    </Guard>
  );
}

function Detail() {
  const { key = '' } = useParams();
  const copy = postCopy(key);
  const { token, user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<Tab>('allmant');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState<{ name: string; total: number; identityCorrect: number; identityWrong: number; vampireCorrect: number; vampireWrong: number }[] | null>(null);

  function load() {
    return api<Board>('/posts', {}, token).then(setBoard);
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token, key]);

  useEffect(() => {
    if (tab !== 'poang') return;
    api<{ rows: NonNullable<typeof scores> }>('/posts/manager/scores', {}, token)
      .then((data) => setScores(data.rows))
      .catch((reason: Error) => setError(reason.message));
  }, [tab, token]);

  if (!copy) {
    return (
      <section className="page">
        <p>Uppdraget finns inte.</p>
        <p><Link to="/uppdrag">Tillbaka till uppdragen</Link></p>
      </section>
    );
  }

  const post = copy;
  const state = board?.posts.find((item) => item.key === post.key);
  const mine = Boolean(state?.mine);
  const taken = Boolean(state?.taken && !mine);
  const other = board?.mine && board.mine !== post.key ? staffPosts.find((item) => item.key === board.mine) : null;
  const paragraphs =
    tab === 'allmant' ? welcomeCopy() :
    tab === 'kvall' ? post.kväll :
    tab === 'uppgift' ? post.uppgift :
    tab === 'spel' ? post.spel :
    tab === 'vampyr' ? vampireRules :
    prizeRules;
  const steps = tab !== 'allmant';
  const primaryOpen = primaryPostKeys.every((item) => board?.posts.find((row) => row.key === item)?.taken);
  const waiting = Boolean(post.later && board && !primaryOpen && !mine);
  const roleTabs = tabs.map((item) => (
    item.id === 'spel' && post.croupier ? { ...item, label: 'Ditt spel' } : item
  ));
  if (post.key === 'manager' && (mine || user?.role === 'admin')) {
    roleTabs.push({ id: 'poang', label: 'Poäng' });
  }

  async function claim() {
    setBusy(true);
    setError('');
    try {
      await api(`/posts/${post.key}/claim`, { method: 'POST' }, token);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ansökan misslyckades.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page brief">
      <p><Link to="/uppdrag">Alla uppdrag</Link></p>
      <h1>{post.title}</h1>
      <div className="tabs">
        {roleTabs.map((item) => (
          <button key={item.id} type="button" className={`btn small${tab === item.id ? '' : ' ghost'}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'allmant' && (
        <div className="facts">
          <p>{whenWhere.date}</p>
          <p><strong>Plats.</strong> {whenWhere.place} {post.plats}</p>
          <p><strong>Tid.</strong> {whenWhere.time}</p>
        </div>
      )}
      {tab === 'vampyr' && post.key === 'manager' && (mine || user?.role === 'admin') && (
        <VampireDesk token={token} />
      )}
      {tab === 'poang' ? (
        <div className="list">
          {scores?.map((row) => (
            <article className="card" key={row.name}>
              <h2>{row.name}</h2>
              <p><strong>{row.total} poäng</strong></p>
              <p className="meta">Matchningar: {row.identityCorrect} rätt, {row.identityWrong} fel. Vampyrer: {row.vampireCorrect} rätt, {row.vampireWrong} fel.</p>
            </article>
          ))}
          {scores && scores.length === 0 && <p>Inga poäng ännu.</p>}
          {!scores && <p>Hämtar poängen…</p>}
        </div>
      ) : steps ? (
        <ol>
          {paragraphs.map((line) => <li key={line}>{line}</li>)}
        </ol>
      ) : (
        paragraphs.map((line) => <p key={line}>{line}</p>)
      )}
      {post.key === 'manager' && (mine || user?.role === 'admin') && (
        <p><Link to="/dorren">Registrera gäster och lägg bilder i mysteriet</Link></p>
      )}
      <ErrorText>{error}</ErrorText>
      {mine && <p className="ok">Det här uppdraget är ditt.</p>}
      {taken && <p>Någon annan hann före. Uppdraget är taget.</p>}
      {waiting && <p>Manager och de tre croupiererna ska väljas först.</p>}
      {!mine && !taken && !other && !waiting && (
        <button className="btn apply" type="button" disabled={busy || !board} onClick={claim}>
          Ansök
        </button>
      )}
    </section>
  );
}
