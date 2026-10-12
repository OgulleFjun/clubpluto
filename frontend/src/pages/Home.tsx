import { Link } from 'react-router-dom';
import { formatWhen } from '../api';
import { usePublicEvent } from '../ui';

export default function Home() {
  const { event, error } = usePublicEvent();
  const title = event?.clubName || 'Club Pluto';
  return (
    <section className="page hero">
      <p className="eyebrow">Sala Analoga Spelförening · SUS</p>
      <h1>{title}</h1>
      <p className="lede">
        {event?.publicIntro ||
          'En maskerad svartklubb i källaren på Folkets hus. Poker, priser och ett mysterium om vem som döljer sig bakom masken.'}
      </p>
      <p className="when">
        <span>{event ? formatWhen(event.eventStartsAt) : 'söndag 1 november 2026 18:30'}</span>
        <span>·</span>
        <span>{event?.location || 'Källaren, Folkets hus, Sala'}</span>
      </p>
      {error && <p className="error">Sidan når inte servern just nu. {error}</p>}
      <div className="actions">
        <Link className="btn" to="/logga-in">Logga in</Link>
        <Link className="btn ghost" to="/regler">Läs reglerna</Link>
      </div>
      <div className="grid cards" style={{ marginTop: '1.4rem' }}>
        <article className="card">
          <div className="index">01</div>
          <h2>Marker</h2>
          <p>Hundra basmarker i dörren. Prismarker när du vinner vid borden. Banken växlar dem mot priser.</p>
        </article>
        <article className="card">
          <div className="index">02</div>
          <h2>Masker</h2>
          <p>Porträtten och namnen ligger var för sig. Para ihop dem innan tävlingen stänger.</p>
        </article>
        <article className="card">
          <div className="index">03</div>
          <h2>Den Förste</h2>
          <p>Någon i rummet är redan vampyr. De röda korten vandrar. Överlevnadspriset går till en människa.</p>
        </article>
      </div>
      {event && (
        <div className="grid cards" style={{ marginTop: '0.8rem' }}>
          {event.games.map((game) => (
            <article className="card" key={game.key}>
              <h2>{game.name}</h2>
              <p>{game.summary}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
