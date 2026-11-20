import { decrypt, encrypt } from '../crypto';
import { openDatabase } from './database';
import type { ClosableTokenStore, CredentialRow } from './token.store.types';

const SCHEMA = `CREATE TABLE IF NOT EXISTS credentials (
    account TEXT PRIMARY KEY,
    refresh_token_enc TEXT NOT NULL,
    updated_at TEXT NOT NULL
)`;

// Guarda só o refresh token, cifrado com AES-256-GCM. O access token vive na memória do cliente OAuth.
export function createSqliteTokenStore(dbPath: string, key: Buffer): ClosableTokenStore {
    const db = openDatabase(dbPath, SCHEMA);
    const upsert = db.prepare(
        `INSERT INTO credentials (account, refresh_token_enc, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(account) DO UPDATE SET refresh_token_enc = excluded.refresh_token_enc, updated_at = excluded.updated_at`,
    );
    const select = db.prepare('SELECT refresh_token_enc FROM credentials WHERE account = ?');
    const remove = db.prepare('DELETE FROM credentials WHERE account = ?');

    return {
        save: (account, refreshToken) => {
            upsert.run(account, encrypt(refreshToken, key), new Date().toISOString());
        },
        get: (account) => {
            const row = select.get(account) as CredentialRow | undefined;
            return row ? decrypt(row.refresh_token_enc, key) : undefined;
        },
        delete: (account) => {
            remove.run(account);
        },
        close: () => db.close(),
    };
}
