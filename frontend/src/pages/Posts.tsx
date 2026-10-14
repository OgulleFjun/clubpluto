import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { staffPosts } from '../posts';
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

  return (
    <Page title="NOW HIRING!" lede="Välj ett uppdrag. Först till kvarn, ett var. Klicka på bilden och läs vad du ska göra.">
      <ErrorText>{error}</ErrorText>
      <div className="hire-row">
        {staffPosts.map((post) => {
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
        })}
      </div>
    </Page>
  );
}
