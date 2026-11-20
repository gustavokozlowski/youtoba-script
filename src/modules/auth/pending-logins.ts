import { createHash, randomBytes } from 'node:crypto';
import type { PendingLogin, PendingLogins, PendingLoginsOptions } from './pending-logins.types';

/** Tempo para voltar do Google; também é a validade do cookie do state. */
export const LOGIN_TTL_MS = 10 * 60_000;

const randomToken = () => randomBytes(32).toString('base64url');
const s256 = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

/**
 * Logins começados e ainda não concluídos. O state amarra a volta do Google ao login que
 * começou aqui (contra CSRF de login) e o verifier do PKCE nunca sai do servidor.
 * Fica em memória: reiniciar o servidor no meio do login só pede para começar de novo.
 */
export function createPendingLogins({ ttlMs, now }: PendingLoginsOptions): PendingLogins {
    const pending = new Map<string, { verifier: string; expiresAt: number }>();

    const dropExpired = () => {
        for (const [state, login] of pending) {
            if (login.expiresAt <= now()) pending.delete(state);
        }
    };

    return {
        start(): PendingLogin {
            dropExpired();
            const state = randomToken();
            const verifier = randomToken();
            pending.set(state, { verifier, expiresAt: now() + ttlMs });
            return { state, codeChallenge: s256(verifier) };
        },
        consume(state) {
            const login = pending.get(state);
            pending.delete(state);
            if (!login || login.expiresAt <= now()) return undefined;
            return login.verifier;
        },
        size: () => pending.size,
    };
}

let logins: PendingLogins | undefined;

/** Os logins pendentes deste servidor. */
export function pendingLogins(): PendingLogins {
    logins ??= createPendingLogins({ ttlMs: LOGIN_TTL_MS, now: Date.now });
    return logins;
}
