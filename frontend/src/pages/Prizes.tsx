import { Page, usePublicEvent } from '../ui';

export default function Prizes() {
  const { event, error } = usePublicEvent();
  return (
    <Page title="Prisbutiken" lede="Prismarkerna är fysiska. Här ser du vad Banken kan lämna ut, och vad det kostar.">
      {error && <p className="error">{error}</p>}
      <div className="grid cards">
        {event?.prizes.map((prize) => (
          <article className="card" key={prize.id}>
            {prize.imageUrl && <img src={prize.imageUrl} alt="" className="portrait" />}
            <h2>{prize.name}</h2>
            <p>{prize.description}</p>
            <p><strong>{prize.cost} prismarker</strong> · {prize.stock} kvar</p>
          </article>
        ))}
        {event && event.prizes.length === 0 && <p>Inga priser är upplagda ännu.</p>}
      </div>
    </Page>
  );
}
