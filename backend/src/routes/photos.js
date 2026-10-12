import fs from 'fs';
import { query } from '../db.js';
import { authenticate, requireRoles } from '../auth.js';
import { asyncRoute, httpError, param } from '../http.js';

export default function photosRouter(app) {
  app.get(
    '/api/photos/:token',
    authenticate,
    requireRoles('admin', 'doorman', 'participant'),
    asyncRoute(async (req, res) => {
      const { rows } = await query(
        'SELECT photo_path FROM participants WHERE photo_token = $1',
        [param(req.params.token)]
      );
      const filePath = rows[0]?.photo_path;
      if (!filePath || !fs.existsSync(filePath)) throw httpError(404, 'Porträttet saknas.');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      fs.createReadStream(filePath).pipe(res);
    })
  );

  app.get(
    '/api/public/prize-images/:id',
    asyncRoute(async (req, res) => {
      const { rows } = await query(
        'SELECT image_path, active FROM prizes WHERE id = $1',
        [param(req.params.id)]
      );
      const prize = rows[0];
      if (!prize?.active || !prize.image_path || !fs.existsSync(prize.image_path)) {
        throw httpError(404, 'Bilden saknas.');
      }
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      fs.createReadStream(prize.image_path).pipe(res);
    })
  );
}
