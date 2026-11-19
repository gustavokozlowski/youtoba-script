import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { decrypt, encrypt } from '../crypto';
import type { ClosableTokenStore } from './token-store.types';

// Guarda só o refresh token, cifrado com AES-256-GCM. O access token vive na memória do cliente OAuth.
export function createSqliteTokenStore(dbPath: string, key: Buffer): ClosableTokenStore {
    const inMemory = dbPath === ':memory:';
    if (!inMemory) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    const db = new Database(dbPath);
    if (!inMemory) {
        fs.chmodSync(dbPath, 0o600);
    }

    db.exec(`CREATE TABLE IF NOT EXISTS credentials (
        account TEXT PRIMARY KEY,
        refresh_token_enc TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`);

    const upsert = db.prepare(
        `INSERT INTO credentials (account, refresh_token_enc, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(account) DO UPDATE SET refresh_token_enc = excluded.refresh_token_enc, updated_at = excluded.updated_at`,
    );
    const select = db.prepare('SELECT refresh_token_enc FROM credentials WHERE account = ?');
    const remove = db.prepare('DELETE FROM credentials WHERE account = ?');

    return {
        save(account, refreshToken) {
            upsert.run(account, encrypt(refreshToken, key), new Date().toISOString());
        },
        get(account) {
            const row = select.get(account) as { refresh_token_enc: string } | undefined;
            return row ? decrypt(row.refresh_token_enc, key) : undefined;
        },
        delete(account) {
            remove.run(account);
        },
        close() {
            db.close();
        },
    };
}
