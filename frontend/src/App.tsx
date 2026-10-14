import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './auth';
import { Layout } from './ui';
import Home from './pages/Home';
import Rules from './pages/Rules';
import Prizes from './pages/Prizes';
import Personal from './pages/Personal';
import Register from './pages/Register';
import Club from './pages/Club';
import Mystery from './pages/Mystery';
import Invites from './pages/Invites';
import Games from './pages/Games';
import Results from './pages/Results';
import Door from './pages/Door';
import Gm from './pages/Gm';
import Admin from './pages/Admin';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';
import PostControl from './pages/PostControl';

export default function App() {
  const { ready } = useAuth();
  if (!ready) return <div className="boot" />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/regler" element={<Rules />} />
        <Route path="/priser" element={<Prizes />} />
        <Route path="/spel" element={<Games />} />
        <Route path="/resultat" element={<Results />} />
        <Route path="/logga-in" element={<Navigate to="/" replace />} />
        <Route path="/personal" element={<Personal />} />
        <Route path="/inbjudan/:token" element={<Register />} />
        <Route path="/klubben" element={<Club />} />
        <Route path="/mysteriet" element={<Mystery />} />
        <Route path="/inbjudningar" element={<Invites />} />
        <Route path="/dorren" element={<Door />} />
        <Route path="/spelledare" element={<Gm />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/uppdrag" element={<Posts />} />
        <Route path="/uppdrag/kontroll" element={<PostControl />} />
        <Route path="/uppdrag/:key" element={<PostDetail />} />
        <Route path="*" element={<Missing />} />
      </Route>
    </Routes>
  );
}

function Missing() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : '/'} replace />;
}
