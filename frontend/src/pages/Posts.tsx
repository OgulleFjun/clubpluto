import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { primaryPostKeys, staffPosts } from '../posts';
import { ErrorText, Field, Guard, Page, Portrait, onSubmit } from '../ui';

interface PostState {
  key: string;
  taken: boolean;
  mine: boolean;
}

export default function Posts() {
  return (
    <Guard roles={['admin', 'doorman', 'gamemaster']}>
      <Board />
    </Guard>
  );
}

function Board() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<PostState[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ posts: PostState[] }>('/posts', {}, token)
      .then((data) => setPosts(data.posts))
      .catch((reason: Error) => setError(reason.message));
  }, [token]);

  const ready = posts.length > 0;
  const primaryOpen = primaryPostKeys.every((key) => posts.find((post) => post.key === key)?.taken);
  const visible = staffPosts.filter((post) => {
    if (!post.later) return true;
    const state = posts.find((item) => item.key === post.key);
    return primaryOpen || Boolean(state?.taken);
  });
  const primary = visible.filter((post) => !post.later);
  const later = visible.filter((post) => post.later);

  function card(post: (typeof staffPosts)[number]) {
    const state = posts.find((item) => item.key === post.key);
    const taken = Boolean(state?.taken && !state.mine);
    const mine = Boolean(state?.mine);
    return (
      <Link key={post.key} to={`/uppdrag/${post.key}`} className={`hire-card${taken ? ' taken' : ''}${mine ? ' mine' : ''}`}>
        <img src={post.image} alt="" />
        <strong>{post.title}</strong>
        <span>{mine ? 'Ditt uppdrag' : taken ? 'Tagen' : 'Ledig'}</span>
      </Link>
    );
  }

  return (
    <Page title="NOW HIRING!" lede="Välj Manager eller en croupier först. Prize Master och Bouncer öppnas när de fyra är tillsatta. Först till kvarn, ett var.">
      <ErrorText>{error}</ErrorText>
      <StaffCostume token={token} />
      <div className="hire-row hire-primary">
        {primary.map(card)}
      </div>
      {ready && !primaryOpen && later.length === 0 && (
        <p className="hire-wait">Prize Master och Bouncer visas när Manager och de tre croupiererna är valda.</p>
      )}
      {later.length > 0 && <div className="hire-row hire-later">{later.map(card)}</div>}
    </Page>
  );
}

function StaffCostume({ token }: { token: string | null }) {
  const [state, setState] = useState<{ open: boolean; opensAt: string; needsProfile: boolean; isFirst?: boolean; costumeToken: string | null } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);

  function load() {
    return api<NonNullable<typeof state>>('/posts/me/costume', {}, token).then(setState);
  }

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function send(event: FormEvent<HTMLFormElement>) {
    setError('');
    setMessage('');
    const form = event.currentTarget;
    try {
      await api('/posts/me/costume', { method: 'POST', body: new FormData(form) }, token);
      form.reset();
      setVersion(Date.now());
      setMessage('Bilden ligger i mysteriet.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Bilden sparades inte.');
    }
  }

  if (!state || state.needsProfile) return null;
  const first = state.isFirst && (
    <article className="card" style={{ marginBottom: '1rem' }}>
      <h2>Du är Den Förste</h2>
      <p>Du är startvampyren. Kvällen börjar med dig.</p>
      <p>Du får två vampyrkort av Managern. Ge ett kort till en gäst som frivilligt vill bli vampyr. Den som tar emot kortet anmäler sig i Banken och tar över kortet.</p>
      <p>För varje person du gör till vampyr får du 1 blodspeng, högst 2.</p>
      <p>Säg det inte till någon. Det syns inte för de andra.</p>
    </article>
  );
  if (!state.open) {
    return (
      <>{first}<p className="meta">
        Klockan {new Date(state.opensAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} kan du lägga in en bild av dig i förklädnaden här.
      </p></>
    );
  }
  return (
    <>{first}
    <form className="card" style={{ marginBottom: '1rem' }} onSubmit={onSubmit(send)}>
      <h2>{state.costumeToken ? 'Din bild i mysteriet' : 'Ta en bild i din förklädnad'}</h2>
      {state.costumeToken && <Portrait token={state.costumeToken} alt="Du i förklädnad" version={version} />}
      <p className="meta">Personalen är också med i mysteriet. Ta bilden med masken på. Den syns utan ditt namn. Har du ingen telefon tar Managern bilden.</p>
      <Field label={state.costumeToken ? 'Ny bild' : 'Bild i förklädnad'}>
        <input name="costume" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required />
      </Field>
      <button className="btn" type="submit">{state.costumeToken ? 'Byt bilden' : 'Lägg i mysteriet'}</button>
      {message && <p className="ok">{message}</p>}
      <ErrorText>{error}</ErrorText>
    </form>
    </>
  );
}

