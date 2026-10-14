import express from 'express';
import cors from 'cors';
import { env } from './config.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import registerRoutes from './routes/register.js';
import clubRoutes from './routes/club.js';
import doorRoutes from './routes/door.js';
import gmRoutes from './routes/gm.js';
import adminRoutes from './routes/admin.js';
import postRoutes from './routes/posts.js';
import photosRouter from './routes/photos.js';

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = new Set(
  [env.frontendUrl, 'http://localhost:5174', 'https://clubpluto.eu', 'https://www.clubpluto.eu']
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ''))
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
      if (env.nodeEnv !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'clubpluto' });
});

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/invitations', registerRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/door', doorRoutes);
app.use('/api/gm', gmRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
photosRouter(app);

app.use((error, _req, res, _next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Bilden är större än 8 MB.' });
  }
  if (error.code === '23505') {
    return res.status(400).json({ message: 'Det finns redan en likadan uppgift.' });
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    message: status >= 500 ? 'Något gick fel på servern.' : error.message,
  });
});

app.listen(env.port, () => {
  console.log(`Club Pluto lyssnar på port ${env.port}`);
});
