// Återställer kvällen efter en testrunda.
//
//   node scripts/reset-test-round.js                         visar vad som skulle tas bort
//   node scripts/reset-test-round.js --yes                   tar backup och återställer
//   node scripts/reset-test-round.js --yes --remove-since="2026-10-25 17:00"
//                                                            tar också bort gäster som registrerades under testet
//
// Återställs: bilder i utklädnad, gissningar, poäng, incheckning och de 100 spelmarkerna.
// Mysteriet och självregistreringen stängs. Konton, porträtt, uppdrag och vampyrer rörs inte.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const confirmed = args.includes('--yes');
const sinceArg = args.find((arg) => arg.startsWith('--remove-since='))?.split('=')[1];
const since = sinceArg ? new Date(sinceArg) : null;
if (since && Number.isNaN(since.getTime())) {
  console.error(`Kan inte läsa tiden "${sinceArg}".`);
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'clubpluto',
  user: String(process.env.DB_USER || process.env.USERNAME || process.env.USER || 'postgres'),
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
});

const client = await pool.connect();
try {
  const costumes = await client.query('SELECT costume_path FROM participants WHERE costume_path IS NOT NULL');
  const counts = await client.query(`
    SELECT
      (SELECT count(*)::int FROM identity_guesses) AS identity,
      (SELECT count(*)::int FROM vampire_guesses) AS vampire,
      (SELECT count(*)::int FROM participants WHERE checked_in_at IS NOT NULL OR base_chips_issued) AS arrived
  `);
  const testGuests = since
    ? await client.query(
      `SELECT p.id, p.name, p.account_id, p.photo_path, p.costume_path
       FROM participants p
       JOIN accounts a ON a.id = p.account_id
       WHERE p.created_at >= $1 AND p.membership <> 'staff' AND a.role = 'participant'
       ORDER BY p.created_at`,
      [since]
    )
    : { rows: [] };

  console.log(`Databas: ${process.env.DB_NAME || 'clubpluto'}`);
  console.log(`${costumes.rows.length} bilder i utklädnad`);
  console.log(`${counts.rows[0].identity} identitetsgissningar, ${counts.rows[0].vampire} vampyrgissningar`);
  console.log(`${counts.rows[0].arrived} incheckade eller med utlämnade marker`);
  if (since) {
    console.log(`${testGuests.rows.length} gäster registrerade sedan ${since.toLocaleString('sv-SE')}:`);
    for (const row of testGuests.rows) console.log(`  ${row.name}`);
  }

  if (!confirmed) {
    console.log('\nInget är ändrat. Kör igen med --yes för att återställa.');
  } else {
    const backup = join(__dirname, '..', '..', 'scripts', 'backup-db.sh');
    execFileSync('bash', [backup], { stdio: 'inherit' });

    await client.query('BEGIN');
    for (const row of testGuests.rows) {
      await client.query('DELETE FROM participants WHERE id = $1', [row.id]);
      await client.query('DELETE FROM accounts WHERE id = $1', [row.account_id]);
    }
    await client.query('DELETE FROM identity_guesses');
    await client.query('DELETE FROM vampire_guesses');
    await client.query('DELETE FROM score_snapshots');
    await client.query(`
      UPDATE participants SET
        costume_path = NULL, costume_token = NULL, costume_at = NULL,
        checked_in_at = NULL, base_chips_issued = false, base_chips = 0
    `);
    await client.query(`
      UPDATE event_settings SET
        costume_upload_open = false,
        identity_open = false,
        results_revealed = false,
        competition_closed_at = NULL,
        updated_at = now()
      WHERE id = 1
    `);
    await client.query('COMMIT');

    for (const row of costumes.rows) fs.rmSync(row.costume_path, { force: true });
    for (const row of testGuests.rows) {
      if (row.photo_path) fs.rmSync(row.photo_path, { force: true });
    }
    console.log('\nTestrundan är återställd.');
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
