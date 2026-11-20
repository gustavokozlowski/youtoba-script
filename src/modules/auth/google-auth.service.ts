import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { setting } from '../../config/settings';
import { parseEncryptionKey } from '../../infra/crypto';
import { dbPath } from '../../infra/storage/db-path';
import { createSqliteTokenStore } from '../../infra/storage/token.store';
import type { TokenStore } from '../../infra/storage/token.store.types';
import { errorMessage, httpErrorLike } from '../../shared/errors';
import type { GoogleAuthConfig } from './google-auth.service.types';
import type { PendingLogin } from './pending-logins.types';

export const DEFAULT_ACCOUNT = 'default';

// force-ssl cobre leitura e escrita de playlists; os outros dois escopos eram redundantes.
export const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];

export class MissingRefreshTokenError extends Error {
    constructor() {
        super('O Google não devolveu um refresh token');
        this.name = 'MissingRefreshTokenError';
    }
}

const isInvalidGrant = (error: unknown): boolean =>
    httpErrorLike<{ error?: string }>(error).response?.data?.error === 'invalid_grant' ||
    errorMessage(error).includes('invalid_grant');

/**
 * Mantém a conexão com o Google de uma conta.
 * O refresh token fica no TokenStore (sobrevive a reinícios); o access token é renovado
 * sozinho pela biblioteca quando expira.
 */
export class GoogleAuth {
    private client: OAuth2Client | undefined;

    constructor(
        private readonly config: GoogleAuthConfig,
        private readonly store: TokenStore,
        private readonly account: string = DEFAULT_ACCOUNT,
    ) {}

    authUrl({ state, codeChallenge }: PendingLogin): string {
        return this.createClient().generateAuthUrl({
            access_type: 'offline',
            // Sem consent o Google só manda refresh token no primeiro login da conta.
            prompt: 'consent',
            scope: SCOPES,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: CodeChallengeMethod.S256,
        });
    }

    async connect(code: string, codeVerifier: string): Promise<void> {
        const client = this.createClient();
        const { tokens } = await client.getToken({ code, codeVerifier });

        if (!tokens.refresh_token) {
            throw new MissingRefreshTokenError();
        }

        this.store.save(this.account, tokens.refresh_token);
        client.setCredentials(tokens);
        this.attach(client);
    }

    isConnected(): boolean {
        return this.store.get(this.account) !== undefined;
    }

    async getAccessToken(): Promise<string | undefined> {
        if (!this.client) {
            const refreshToken = this.store.get(this.account);
            if (!refreshToken) {
                return undefined;
            }
            const client = this.createClient();
            client.setCredentials({ refresh_token: refreshToken });
            this.attach(client);
        }

        try {
            const { token } = await (this.client as OAuth2Client).getAccessToken();
            return token ?? undefined;
        } catch (error) {
            if (isInvalidGrant(error)) {
                // Refresh token expirado ou revogado (em modo Testing o Google expira em 7 dias).
                this.forget();
                return undefined;
            }
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        const refreshToken = this.store.get(this.account);
        if (refreshToken) {
            try {
                await this.createClient().revokeToken(refreshToken);
            } catch {
                // Já inválido no Google: basta apagar localmente.
            }
        }
        this.forget();
    }

    private createClient(): OAuth2Client {
        return new OAuth2Client(this.config.clientId, this.config.clientSecret, this.config.redirectUrl);
    }

    private attach(client: OAuth2Client) {
        client.on('tokens', (tokens) => {
            // O Google pode rotacionar o refresh token; guarda o novo quando vier.
            if (tokens.refresh_token) {
                this.store.save(this.account, tokens.refresh_token);
            }
        });
        this.client = client;
    }

    private forget() {
        this.store.delete(this.account);
        this.client = undefined;
    }
}

let instance: GoogleAuth | undefined;

/** A conexão com o Google da conta padrão, criada na primeira vez que alguém precisa dela. */
export function googleAuth(): GoogleAuth {
    instance ??= new GoogleAuth(
        {
            clientId: setting('CLIENT_ID'),
            clientSecret: setting('CLIENT_SECRET_KEY'),
            redirectUrl: setting('REDIRECT_URL'),
        },
        createSqliteTokenStore(dbPath(), parseEncryptionKey(setting('TOKEN_ENCRYPTION_KEY'))),
    );
    return instance;
}
