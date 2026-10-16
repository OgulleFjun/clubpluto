import { Link } from 'react-router-dom';
import { LinkedText, Page, usePublicEvent } from '../ui';

export default function Games() {
  const { event } = usePublicEvent();
  return (
    <Page title="Spelen" lede="Tre bord. Markerna är riktiga. Spelledaren skriver upp prismarkerna.">
      <div className="grid">
        {event?.games.map((game) => (
          <article className="card" key={game.key}>
            <h2>{game.name}</h2>
            <p>{game.summary}</p>
            <p className="prose"><LinkedText text={game.rules} /></p>
          </article>
        ))}
      </div>
      <p><Link to="/priser">Se priserna</Link></p>
    </Page>
  );
}
