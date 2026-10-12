import { Page, usePublicEvent } from '../ui';

export default function Rules() {
  const { event, error } = usePublicEvent();
  return (
    <Page title="Regler" lede="Det fysiska spelet är kvällen. Hemsidan håller reda på vem som är med.">
      {error && <p className="error">{error}</p>}
      <article className="card prose">{event?.rulesText || 'Reglerna laddas…'}</article>
      <div className="grid" style={{ marginTop: '1rem' }}>
        {event?.games.map((game) => (
          <article className="card" key={game.key}>
            <h2>{game.name}</h2>
            <p>{game.summary}</p>
            <p className="prose">{game.rules}</p>
          </article>
        ))}
      </div>
    </Page>
  );
}
