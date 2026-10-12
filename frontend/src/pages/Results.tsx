import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Page } from '../ui';

export default function Results() {
  const { user } = useAuth();
  return (
    <Page title="Resultat" lede="Poängen och vampyrerna visas när arrangören avslöjar facit.">
      {user?.role === 'participant' ? (
        <p><Link className="btn" to="/mysteriet">Öppna mysteriet</Link></p>
      ) : (
        <p><Link to="/logga-in">Logga in</Link> för att se din egen lapp när kvällen är slut.</p>
      )}
    </Page>
  );
}
