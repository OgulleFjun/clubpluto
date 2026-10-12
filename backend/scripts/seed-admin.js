#!/usr/bin/env node
/**
 * Skapa eller uppdatera första administratören.
 *   node scripts/seed-admin.js <email> <lösenord>
 */
import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const email = (process.env.SEED_ADMIN_EMAIL || process.argv[2] || '').trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || process.argv[3];

if (!email || !password) {
  console.error('Användning: node scripts/seed-admin.js <email> <lösenord>');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'clubpluto',
  user: String(process.env.DB_USER || process.env.USERNAME || process.env.USER || 'postgres'),
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
});

const hash = await bcrypt.hash(password, 10);
const client = await pool.connect();
try {
  await client.query(
    `INSERT INTO accounts (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = 'admin', active = true`,
    [email, hash]
  );
  console.log('Admin skapad eller uppdaterad:', email);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
