import { Router } from 'express';
import { query } from '../db.js';
import { getSettings, presentSettings } from '../competition.js';
import { asyncRoute } from '../http.js';

const router = Router();

router.get(
  '/event',
  asyncRoute(async (_req, res) => {
    const settings = await getSettings();
    const games = await query('SELECT key, name, summary, rules FROM games ORDER BY sort_order, name');
    const prizes = await query(
      `SELECT id, name, description, cost, stock, image_path
       FROM prizes WHERE active ORDER BY sort_order, cost, name`
    );
    const presented = presentSettings(settings);
    res.json({
      clubName: presented.clubName,
      tagline: presented.tagline,
      eventStartsAt: presented.eventStartsAt,
      location: presented.location,
      publicIntro: presented.publicIntro,
      rulesText: presented.rulesText,
      registrationOpen: presented.registrationOpen,
      resultsRevealed: presented.resultsRevealed,
      games: games.rows,
      prizes: prizes.rows.map((prize) => ({
        id: prize.id,
        name: prize.name,
        description: prize.description,
        cost: prize.cost,
        stock: prize.stock,
        imageUrl: prize.image_path ? `/api/public/prize-images/${prize.id}` : null,
      })),
    });
  })
);

export default router;
