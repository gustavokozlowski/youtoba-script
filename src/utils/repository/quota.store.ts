import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { ClosableQuotaStore } from './quota-store.types';

export function createSqliteQuotaStore(file: string): ClosableQuotaStore {
    if (file !== ':memory:') {
        fs.mkdirSync(path.dirname(file), { recursive: true });
    }

    const db = new Database(file);
    db.exec(`CREATE TABLE IF NOT EXISTS quota_usage (
        day TEXT PRIMARY KEY,
        units INTEGER NOT NULL
    )`);

    const select = db.prepare('SELECT units FROM quota_usage WHERE day = ?');
    const add = db.prepare(
        `INSERT INTO quota_usage (day, units) VALUES (?, ?)
         ON CONFLICT(day) DO UPDATE SET units = units + excluded.units`,
    );
    const set = db.prepare(
        `INSERT INTO quota_usage (day, units) VALUES (?, ?)
         ON CONFLICT(day) DO UPDATE SET units = excluded.units`,
    );

    return {
        get(day) {
            const row = select.get(day) as { units: number } | undefined;
            return row?.units ?? 0;
        },
        add(day, units) {
            add.run(day, units);
        },
        set(day, units) {
            set.run(day, units);
        },
        close() {
            db.close();
        },
    };
}
