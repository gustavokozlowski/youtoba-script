import { parseEncryptionKey } from '../../utils/crypto';
import { dbPath } from '../../utils/repository/db-path';
import { createSqliteTokenStore } from '../../utils/repository/token.store';
import { GoogleAuth } from './google-auth';

let instance: GoogleAuth | undefined;

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
