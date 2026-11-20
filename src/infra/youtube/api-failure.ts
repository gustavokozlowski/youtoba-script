import { httpErrorLike } from '../../shared/errors';
import type { GoogleApiErrorBody } from '../../shared/errors.types';
import type { ApiFailure } from './youtube-api.types';

// Extrai só o que importa do erro do axios. O objeto inteiro carrega o header Authorization.
export const apiFailure = (error: unknown): ApiFailure => {
    const { response, message } = httpErrorLike<GoogleApiErrorBody>(error);
    const body = response?.data?.error;
    return {
        status: response?.status,
        reason: body?.errors?.[0]?.reason,
        message: body?.message ?? (typeof message === 'string' ? message : undefined),
    };
};
