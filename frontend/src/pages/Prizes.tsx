import { Page, usePublicEvent } from '../ui';

export default function Prizes() {
  const { event, error } = usePublicEvent();
  return (
    <Page title="Prisbutiken" lede="5 tiers. Bara blodspengar köper priser. De kan ges bort. Bara barn och ungdomar kan vinna dem hos Prize Master.">
      {error && <p className="error">{error}</p>}
      <ol className="tiers">
        {event?.prizes.map((prize) => (
          <li key={prize.id}>
            {prize.imageUrl && <img src={prize.imageUrl} alt="" className="portrait" />}
            <p className="index">{prize.name}</p>
            {prize.description && <p>{prize.description}</p>}
            <p><strong>{prize.cost} blodspengar</strong>{prize.stock > 0 ? ` · ${prize.stock} kvar` : ''}</p>
          </li>
        ))}
      </ol>
      {event && event.prizes.length === 0 && <p>Inga priser är upplagda ännu.</p>}
    </Page>
  );
}
