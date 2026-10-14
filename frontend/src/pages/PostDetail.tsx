import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { postCopy, primaryPostKeys, prizeRules, staffPosts, vampireRules, welcomeCopy, whenWhere } from '../posts';
import { ErrorText, Guard } from '../ui';

type Tab = 'allmant' | 'kvall' | 'uppgift' | 'spel' | 'vampyr' | 'priser';

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
  const { token } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<Tab>('allmant');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    return api<Board>('/posts', {}, token).then(setBoard);
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token, key]);

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
    tab === 'allmant' ? welcomeCopy(Boolean(post.croupier)) :
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
      {steps ? (
        <ol>
          {paragraphs.map((line) => <li key={line}>{line}</li>)}
        </ol>
      ) : (
        paragraphs.map((line) => <p key={line}>{line}</p>)
      )}
      <ErrorText>{error}</ErrorText>
      {mine && <p className="ok">Det här uppdraget är ditt.</p>}
      {taken && <p>Någon annan hann före. Uppdraget är taget.</p>}
      {other && <p>Du har redan {other.title}. En administratör kan flytta dig.</p>}
      {waiting && <p>Manager och de tre croupiererna ska väljas först.</p>}
      {!mine && !taken && !other && !waiting && (
        <button className="btn apply" type="button" disabled={busy || !board} onClick={claim}>
          Ansök
        </button>
      )}
    </section>
  );
}
