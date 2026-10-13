import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const env = {
  port: Number(process.env.PORT) || 3010,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'clubpluto',
    user: String(process.env.DB_USER || process.env.USERNAME || process.env.USER || 'postgres'),
    password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
  },
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  playerGatePassword: process.env.PLAYER_GATE_PASSWORD || '123ABC!',
  staffGatePassword: process.env.STAFF_GATE_PASSWORD || 'banan',
  portraitDir: process.env.PORTRAIT_DIR || path.join(root, 'uploads', 'portraits'),
  prizeDir: process.env.PRIZE_DIR || path.join(root, 'uploads', 'prizes'),
};
