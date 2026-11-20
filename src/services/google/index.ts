import { parseEncryptionKey } from '../../utils/crypto';
import { dbPath } from '../../utils/repository/db-path';
import { createSqliteTokenStore } from '../../utils/repository/token.store';
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
        const key = parseEncryptionKey(process.env.TOKEN_ENCRYPTION_KEY);
        const store = createSqliteTokenStore(dbPath(), key);
        instance = new GoogleAuth(
            {
                clientId: process.env.CLIENT_ID ?? '',
                clientSecret: process.env.CLIENT_SECRET_KEY ?? '',
                redirectUrl: process.env.REDIRECT_URL ?? '',
            },
            store,
        );
    }
    return instance;
}

export { GoogleAuth, MissingRefreshTokenError } from './google-auth';
