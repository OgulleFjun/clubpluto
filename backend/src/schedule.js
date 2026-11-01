import { query } from './db.js';
import { closeCompetition, getSettings } from './competition.js';

/** Det som ska hända av sig självt under kvällen. Varje steg körs bara en gång. */
export async function runSchedule(now = new Date()) {
  const settings = await getSettings();
  if (
    !settings.costume_auto_opened_at &&
    !settings.competition_closed_at &&
    now >= new Date(settings.event_starts_at)
  ) {
    await query(
      `UPDATE event_settings
       SET costume_upload_open = true, costume_auto_opened_at = now(), updated_at = now()
       WHERE id = 1 AND costume_auto_opened_at IS NULL`
    );
    console.log('Självregistreringen öppnade av sig själv.');
  }
  if (!settings.survival_decided_at && now >= new Date(settings.survival_decide_at)) {
    if (!settings.competition_closed_at) await closeCompetition();
    await query('UPDATE event_settings SET survival_decided_at = now() WHERE id = 1');
    console.log('Överlevnadspriset är avgjort.');
  }
}

export function startSchedule() {
  const tick = () => runSchedule().catch((error) => console.error('Schemat stannade:', error));
  tick();
  setInterval(tick, 30 * 1000);
}
