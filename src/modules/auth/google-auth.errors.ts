import { errorMessage, httpErrorLike } from '../../shared/errors';
import type { OAuthErrorBody } from './google-auth.service.types';

/** O Google concluiu o login sem mandar o refresh token (acontece sem prompt=consent). */
export class MissingRefreshTokenError extends Error {
    constructor() {
        super('O Google não devolveu um refresh token');
        this.name = 'MissingRefreshTokenError';
    }
}

/** Refresh token expirado ou revogado (em modo Testing o Google expira em 7 dias). */
export const isInvalidGrant = (error: unknown): boolean =>
    httpErrorLike<OAuthErrorBody>(error).response?.data?.error === 'invalid_grant' ||
    errorMessage(error).includes('invalid_grant');
