import type { ApiErrorBody } from './api.types';

/** Disparado quando a API responde 401: o login expirou ou a conta foi desconectada. */
export const UNAUTHORIZED_EVENT = 'youtoba:unauthorized';

export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
        message: string,
        readonly body?: ApiErrorBody,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

const OFFLINE_MESSAGE = 'O servidor do youtoba não respondeu. Confira se o `npm run dev` está rodando.';

async function request<T>(method: string, path: string): Promise<T> {
    let response: Response;
    try {
        response = await fetch(path, { method, headers: { accept: 'application/json' } });
    } catch {
        throw new ApiError(0, 'offline', OFFLINE_MESSAGE);
    }

    const body = await response.json().catch(() => undefined);
    if (response.ok) return body as T;

    if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const error = (body ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
        response.status,
        error.erro ?? 'http_error',
        error.mensagem ?? `O servidor respondeu ${response.status}.`,
        body as ApiErrorBody | undefined,
    );
}

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    send: <T>(method: 'POST' | 'DELETE', path: string) => request<T>(method, path),
};
