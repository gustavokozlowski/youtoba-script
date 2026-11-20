import { openDatabase } from './database';
import type { ClosableQuotaStore, QuotaRow } from './quota.store.types';

const SCHEMA = `CREATE TABLE IF NOT EXISTS quota_usage (
    day TEXT PRIMARY KEY,
    units INTEGER NOT NULL
)`;

/** Unidades de quota gastas por dia, somadas a cada chamada ao YouTube. */
export function createSqliteQuotaStore(file: string): ClosableQuotaStore {
    const db = openDatabase(file, SCHEMA);
    const select = db.prepare('SELECT units FROM quota_usage WHERE day = ?');
    const upsert = (onConflict: string) =>
        db.prepare(`INSERT INTO quota_usage (day, units) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET ${onConflict}`);
    const add = upsert('units = units + excluded.units');
    const set = upsert('units = excluded.units');

    return {
        get: (day) => (select.get(day) as QuotaRow | undefined)?.units ?? 0,
        add: (day, units) => {
            add.run(day, units);
        },
        set: (day, units) => {
            set.run(day, units);
        },
        close: () => db.close(),
    };
}
