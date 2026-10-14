import { query, withTransaction } from './db.js';
import { httpError } from './http.js';
import { conversionCredit } from './scoring.js';

export async function creditConversion(newbieId, sireId) {
  if (!newbieId || !sireId) throw httpError(400, 'Välj både den nya vampyren och den som förvandlade.');
  if (newbieId === sireId) throw httpError(400, 'En vampyr kan inte peka på sig själv.');
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, name, is_vampire, conversion_chips, sire_paid
       FROM participants WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [[newbieId, sireId]]
    );
    const newbie = rows.find((row) => row.id === newbieId);
    const sire = rows.find((row) => row.id === sireId);
    if (!newbie || !sire) throw httpError(404, 'Personen finns inte.');
    const decision = conversionCredit({
      newbieIsVampire: newbie.is_vampire,
      sireIsVampire: sire.is_vampire,
      alreadyPaid: newbie.sire_paid,
      sireChips: sire.conversion_chips,
    });
    if (!decision.ok) throw httpError(409, decision.message);
    await client.query('UPDATE participants SET conversion_chips = conversion_chips + 1 WHERE id = $1', [sire.id]);
    await client.query(
      'UPDATE participants SET turned_by_id = $2, sire_paid = true WHERE id = $1',
      [newbie.id, sire.id]
    );
    return { sireName: sire.name, conversionChips: decision.nextChips };
  });
}
