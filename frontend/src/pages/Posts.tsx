import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { primaryPostKeys, staffPosts } from '../posts';
import { ErrorText, Guard, Page } from '../ui';

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
