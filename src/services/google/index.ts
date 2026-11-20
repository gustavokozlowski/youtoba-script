import { setting } from '../../config/settings';
import { parseEncryptionKey } from '../../infra/crypto';
import { dbPath } from '../../infra/storage/db-path';
import { createSqliteTokenStore } from '../../infra/storage/token.store';
import { GoogleAuth } from './google-auth';
import { createPendingLogins } from './pending-logins';
import type { PendingLogins } from './pending-logins.types';

/** Tempo para voltar do Google; também é a validade do cookie do state. */
export const LOGIN_TTL_MS = 10 * 60_000;

let instance: GoogleAuth | undefined;
let logins: PendingLogins | undefined;

export function pendingLogins(): PendingLogins {
    logins ??= createPendingLogins({ ttlMs: LOGIN_TTL_MS, now: Date.now });
    return logins;
}

export function googleAuth(): GoogleAuth {
    if (!instance) {
        const key = parseEncryptionKey(setting('TOKEN_ENCRYPTION_KEY'));
        const store = createSqliteTokenStore(dbPath(), key);
        instance = new GoogleAuth(
            {
                clientId: setting('CLIENT_ID'),
                clientSecret: setting('CLIENT_SECRET_KEY'),
                redirectUrl: setting('REDIRECT_URL'),
            },
            store,
        );
    }
    return instance;
}

export { GoogleAuth, MissingRefreshTokenError } from './google-auth';
