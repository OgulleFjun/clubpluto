import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Guard, Page } from '../ui';

interface Holder {
  id: string;
  email: string;
  name: string;
}
interface ManagedPost {
  key: string;
  title: string;
  holder: Holder | null;
}
interface Account {
  id: string;
  email: string;
  name: string;
  postKey: string | null;
}
interface ManageData {
  posts: ManagedPost[];
  accounts: Account[];
}

export default function PostControl() {
  return (
    <Guard roles={['admin']}>
      <Control />
    </Guard>
  );
}

function Control() {
  const { token } = useAuth();
  const [data, setData] = useState<ManageData | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  function load() {
    return api<ManageData>('/posts/manage', {}, token).then((next) => {
      setData(next);
      setChoice(Object.fromEntries(next.posts.map((post) => [post.key, post.holder?.id || ''])));
    });
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function save(key: string) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await api(`/posts/${key}/assign`, {
        method: 'POST',
        body: JSON.stringify({ accountId: choice[key] || null }),
      }, token);
      await load();
      setMessage('Personalraden är sparad.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Det gick inte att spara.');
    } finally {
      setBusy('');
    }
  }

  if (!data) {
    return <Page title="Kontroll">{error || 'Hämtar personalen…'}</Page>;
  }

  return (
    <Page title="Kontroll" lede="Bara du som administratör ser den här sidan. Flytta eller frigör ett uppdrag. En person kan bara ha ett.">
      <ErrorText>{error}</ErrorText>
      {message && <p className="ok">{message}</p>}
      <div className="list">
        {data.posts.map((post) => (
          <article className="card" key={post.key}>
            <h2>{post.title}</h2>
            <p>{post.holder ? `${post.holder.name} har uppdraget.` : 'Ledigt.'}</p>
            <label className="field">
              <span>Person</span>
              <select value={choice[post.key] || ''} onChange={(event) => setChoice({ ...choice, [post.key]: event.target.value })}>
                <option value="">Ledig</option>
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}{account.name !== account.email ? ` · ${account.email}` : ''}
                    {account.postKey && account.postKey !== post.key ? ' · har ett annat uppdrag' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" type="button" disabled={busy === post.key} onClick={() => save(post.key)}>
              Spara
            </button>
          </article>
        ))}
      </div>
      <p className="meta">Övrigt om gäster, vampyrer och priser finns i <Link to="/admin">klubbens kontrollpanel</Link>.</p>
    </Page>
  );
}
