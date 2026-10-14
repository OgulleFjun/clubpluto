import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { maskRule, postCopy, staffPosts } from '../posts';
import { ErrorText, Guard } from '../ui';

type Tab = 'allmant' | 'kvall' | 'uppgift' | 'spel';

const tabs: { id: Tab; label: string }[] = [
  { id: 'allmant', label: 'Allmänt' },
  { id: 'kvall', label: 'Kvällen' },
  { id: 'uppgift', label: 'Uppgift' },
  { id: 'spel', label: 'Spel' },
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
  const paragraphs = tab === 'allmant' ? post.allmän : tab === 'kvall' ? post.kväll : tab === 'uppgift' ? post.uppgift : post.spel;
  const steps = tab === 'uppgift' || tab === 'spel';

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
        {tabs.map((item) => (
          <button key={item.id} type="button" className={`btn small${tab === item.id ? '' : ' ghost'}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {(tab === 'allmant' || tab === 'kvall') && <p className="callout">{maskRule}</p>}
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
      {!mine && !taken && !other && (
        <button className="btn apply" type="button" disabled={busy || !board} onClick={claim}>
          Ansök
        </button>
      )}
    </section>
  );
}
