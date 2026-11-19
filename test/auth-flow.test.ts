import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nock from 'nock';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const GOOGLE_OAUTH = 'https://oauth2.googleapis.com';
const YOUTUBE = 'https://youtube.googleapis.com';
let dir: string;
let dbPath: string;

// Sobe a aplicação do zero, como um processo novo do servidor lendo o mesmo banco.
async function bootApp() {
    vi.resetModules();
    const { createApp } = await import('../src/server/app');
    return createApp();
}

const tokenResponse = (body: Record<string, unknown>) =>
    nock(GOOGLE_OAUTH)
        .post('/token')
        .reply(200, { token_type: 'Bearer', expires_in: 3599, ...body });

const playlistsCalledWith = (accessToken: string) =>
    nock(YOUTUBE)
        .get('/youtube/v3/playlists')
        .query(true)
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, { items: [], pageInfo: { totalResults: 0, resultsPerPage: 50 } });

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtoba-auth-'));
    dbPath = path.join(dir, 'tokens.db');
    Object.assign(process.env, {
        TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
        TOKEN_DB_PATH: dbPath,
        CLIENT_ID: 'test-client.apps.googleusercontent.com',
        CLIENT_SECRET_KEY: 'test-secret',
        REDIRECT_URL: 'http://localhost:3000/auth',
        API_KEY: 'test-api-key',
        YOUTUBE_BASE_URL: `${YOUTUBE}/youtube/v3/`,
    });
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
});

beforeEach(() => fs.rmSync(dbPath, { force: true }));

afterEach(() => {
    // Limpa antes de checar: um mock pendente não pode contaminar o teste seguinte.
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
});

afterAll(() => {
    nock.enableNetConnect();
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('login com Google', () => {
    it('/auth/login redireciona para o Google pedindo acesso offline e só o escopo necessário', async () => {
        const res = await request(await bootApp()).get('/auth/login');
        expect(res.status).toBe(302);
        const url = new URL(res.headers.location);
        expect(url.origin).toBe('https://accounts.google.com');
        expect(url.searchParams.get('access_type')).toBe('offline');
        expect(url.searchParams.get('prompt')).toBe('consent');
        expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/youtube.force-ssl');
    });

    it('o callback salva o login sem mandar token ao navegador, e as chamadas ao YouTube usam o access token', async () => {
        const app = await bootApp();
        tokenResponse({ access_token: 'at-1', refresh_token: 'rt-1' });

        const callback = await request(app).get('/auth?code=codigo-valido');
        expect(callback.status).toBe(200);
        expect(callback.text).toContain('Conectado ao YouTube');
        expect(callback.text).not.toContain('at-1');
        expect(callback.text).not.toContain('rt-1');

        expect((await request(app).get('/auth/status')).body).toEqual({ connected: true });
        expect(fs.readFileSync(dbPath).includes('rt-1')).toBe(false);

        playlistsCalledWith('at-1');
        expect((await request(app).get('/playlist/get-all')).status).toBe(200);
    });

    it('continua conectado depois de reiniciar o servidor, renovando o access token sozinho', async () => {
        tokenResponse({ access_token: 'at-1', refresh_token: 'rt-1' });
        await request(await bootApp()).get('/auth?code=codigo-valido');

        const restarted = await bootApp();
        expect((await request(restarted).get('/auth/status')).body).toEqual({ connected: true });

        nock(GOOGLE_OAUTH)
            .post('/token', (body) => body.grant_type === 'refresh_token' && body.refresh_token === 'rt-1')
            .reply(200, { access_token: 'at-2', token_type: 'Bearer', expires_in: 3599 });
        playlistsCalledWith('at-2');

        expect((await request(restarted).get('/playlist/get-all')).status).toBe(200);
    });

    it('guarda o refresh token novo quando o Google rotaciona', async () => {
        tokenResponse({ access_token: 'at-1', refresh_token: 'rt-1' });
        await request(await bootApp()).get('/auth?code=codigo-valido');

        const restarted = await bootApp();
        tokenResponse({ access_token: 'at-2', refresh_token: 'rt-rotacionado' });
        playlistsCalledWith('at-2');
        await request(restarted).get('/playlist/get-all');

        const again = await bootApp();
        nock(GOOGLE_OAUTH)
            .post('/token', (body) => body.refresh_token === 'rt-rotacionado')
            .reply(200, { access_token: 'at-3', token_type: 'Bearer', expires_in: 3599 });
        playlistsCalledWith('at-3');
        expect((await request(again).get('/playlist/get-all')).status).toBe(200);
    });

    it('quando o Google invalida o refresh token (7 dias em Testing), desconecta e pede novo login', async () => {
        tokenResponse({ access_token: 'at-1', refresh_token: 'rt-1' });
        await request(await bootApp()).get('/auth?code=codigo-valido');

        const restarted = await bootApp();
        nock(GOOGLE_OAUTH)
            .post('/token')
            .reply(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' });

        expect((await request(restarted).get('/playlist/get-all')).status).toBe(401);
        expect((await request(restarted).get('/auth/status')).body).toEqual({ connected: false });
    });

    it('logout revoga o token no Google e apaga o login local', async () => {
        const app = await bootApp();
        tokenResponse({ access_token: 'at-1', refresh_token: 'rt-1' });
        await request(app).get('/auth?code=codigo-valido');

        nock(GOOGLE_OAUTH).post('/revoke').query({ token: 'rt-1' }).reply(200, {});
        expect((await request(app).post('/auth/logout')).body).toEqual({ connected: false });
        expect((await request(app).get('/auth/status')).body).toEqual({ connected: false });
        expect((await request(app).get('/playlist/get-all')).status).toBe(401);
    });

    it('recusa o login quando o Google não manda refresh token', async () => {
        const app = await bootApp();
        tokenResponse({ access_token: 'at-1' });

        expect((await request(app).get('/auth?code=codigo-valido')).status).toBe(502);
        expect((await request(app).get('/auth/status')).body).toEqual({ connected: false });
    });

    it('mostra o erro do Google escapado quando o login é negado', async () => {
        const res = await request(await bootApp()).get('/auth?error=%3Cscript%3Ealert(1)%3C/script%3E');
        expect(res.status).toBe(400);
        expect(res.text).not.toContain('<script>');
        expect(res.text).toContain('&#60;script&#62;');
    });
});
