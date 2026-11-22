import { randomBytes } from 'node:crypto';
import nock from 'nock';
import type request from 'supertest';
import { vi } from 'vitest';
import type { UnmatchedRequest } from '../playlist-flow.types';

export const GOOGLE_OAUTH = 'https://oauth2.googleapis.com';
export const YOUTUBE = 'https://youtube.googleapis.com';

/**
 * Prepara o ambiente dos testes de fluxo: variáveis de OAuth, rede bloqueada (só 127.0.0.1) e um registro
 * dos pedidos externos sem mock (ex.: um DELETE ou POST inesperado). Devolve a lista, que o teste confere vazia.
 */
export function installNetworkGuard(): string[] {
    const unmatched: string[] = [];
    Object.assign(process.env, {
        TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
        CLIENT_ID: 'test-client.apps.googleusercontent.com',
        CLIENT_SECRET_KEY: 'test-secret',
        REDIRECT_URL: 'http://localhost:3000/auth',
        API_KEY: 'test-api-key',
    });
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    nock.emitter.on('no match', (req: UnmatchedRequest) => {
        const host = req.hostname ?? req.host ?? (req.href ? new URL(req.href).hostname : '');
        if (!['127.0.0.1', 'localhost'].includes(host)) unmatched.push(`${req.method} ${host}${req.path ?? ''}`);
    });
    return unmatched;
}

/** Sobe um app novo com o limite de quota pedido (módulos recarregados para zerar os singletons). */
export async function bootApp(dailyQuota = 10_000): Promise<Parameters<typeof request>[0]> {
    process.env.YOUTUBE_DAILY_QUOTA = String(dailyQuota);
    vi.resetModules();
    const { createApp } = await import('../../src/server/app');
    return createApp();
}

/** Mock da renovação do access token, para um app reiniciado com o login ainda salvo. */
export function mockTokenRefresh() {
    nock(GOOGLE_OAUTH)
        .post('/token', (body) => body.grant_type === 'refresh_token')
        .reply(200, { access_token: 'at-2', token_type: 'Bearer', expires_in: 3599 });
}

/** Mock do primeiro login (troca do code por tokens). */
export function mockFirstLogin() {
    nock(GOOGLE_OAUTH)
        .post('/token')
        .reply(200, { access_token: 'at-1', refresh_token: 'rt-1', token_type: 'Bearer', expires_in: 3599 });
}
