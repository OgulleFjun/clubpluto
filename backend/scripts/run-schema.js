import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'clubpluto',
  user: String(process.env.DB_USER || process.env.USERNAME || process.env.USER || 'postgres'),
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
});

const client = await pool.connect();
try {
  await client.query(sql);
  console.log('Schema kördes.');
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
