import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nock from 'nock';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaylistBackup } from '../src/services/youtube/backup';

const GOOGLE_OAUTH = 'https://oauth2.googleapis.com';
const YOUTUBE = 'https://youtube.googleapis.com';
const PLAYLIST = 'PLbig';

let dir: string;
let backupDir: string;
let app: Parameters<typeof request>[0];
let unmatched: string[] = [];

// 1.000 itens, 3 duplicados: posição 50 repete a 2 (página 1 → página 2), 700 repete a 3, 999 repete a 500.
const DUPLICATE_OF: Record<number, number> = { 50: 2, 700: 3, 999: 500 };
const bigPlaylist = Array.from({ length: 1_000 }, (_, position) => ({
    id: `item-${position}`,
    videoId: `v${DUPLICATE_OF[position] ?? position}`,
    position,
}));

const apiItem = (item: { id: string; videoId: string; position: number }) => ({
    kind: 'youtube#playlistItem',
    etag: 'e',
    id: item.id,
    snippet: { title: `Vídeo ${item.videoId}`, position: item.position, videoOwnerChannelTitle: 'Canal' },
    contentDetails: { videoId: item.videoId },
});

/** Simula a listagem paginada (50 por página) e conta as chamadas. */
function mockListing(items = bigPlaylist, playlistId = PLAYLIST) {
    const calls = { count: 0 };
    const pages = Math.ceil(items.length / 50);
    nock(YOUTUBE)
        .get('/youtube/v3/playlistItems')
        .query((q) => q.playlistId === playlistId && q.part === 'snippet,contentDetails' && q.maxResults === '50')
        .times(pages)
        .reply((uri) => {
            calls.count++;
            const page = Number(new URL(uri, YOUTUBE).searchParams.get('pageToken') ?? 0);
            const slice = items.slice(page * 50, page * 50 + 50);
            const hasNext = (page + 1) * 50 < items.length;
            return [
                200,
                {
                    pageInfo: { totalResults: items.length, resultsPerPage: 50 },
                    items: slice.map(apiItem),
                    ...(hasNext ? { nextPageToken: String(page + 1) } : {}),
                },
            ];
        });
    return calls;
}

const backups = () => (fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : []);

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtoba-playlist-'));
    Object.assign(process.env, {
        TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
        TOKEN_DB_PATH: path.join(dir, 'tokens.db'),
        CLIENT_ID: 'test-client.apps.googleusercontent.com',
        CLIENT_SECRET_KEY: 'test-secret',
        REDIRECT_URL: 'http://localhost:3000/auth',
        API_KEY: 'test-api-key',
        YOUTUBE_BASE_URL: `${YOUTUBE}/youtube/v3/`,
        YOUTUBE_DAILY_QUOTA: '10000',
    });
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    // Qualquer chamada a um host externo sem mock (ex.: um DELETE inesperado) é registrada e falha o teste.
    nock.emitter.on('no match', (req: any) => {
        const host = req.hostname ?? req.host ?? (req.href ? new URL(req.href).hostname : '');
        if (!['127.0.0.1', 'localhost'].includes(host)) unmatched.push(`${req.method} ${host}${req.path ?? ''}`);
    });
});

beforeEach(async () => {
    backupDir = path.join(dir, `backups-${Date.now()}-${Math.random()}`);
    process.env.BACKUP_DIR = backupDir;
    unmatched = [];

    vi.resetModules();
    const { createApp } = await import('../src/server/app');
    app = createApp();

    nock(GOOGLE_OAUTH)
        .post('/token')
        .reply(200, { access_token: 'at-1', refresh_token: 'rt-1', token_type: 'Bearer', expires_in: 3599 });
    await request(app).get('/auth?code=codigo-valido').expect(200);
});

afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
    expect(unmatched).toEqual([]);
});

afterAll(() => {
    nock.enableNetConnect();
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('dry-run de duplicados', () => {
    it('lê 1.000 itens em 20 chamadas e acha duplicados entre páginas, sem apagar nada', async () => {
        const listing = mockListing();

        const res = await request(app).get(`/playlist/${PLAYLIST}/duplicates`);

        expect(res.status).toBe(200);
        expect(listing.count).toBe(20);
        expect(res.body).toMatchObject({ totalItens: 1_000, ficam: 997, duplicados: 3 });
        expect(res.body.itensDuplicados.map((d: any) => [d.posicao, d.primeiraOcorrencia])).toEqual([
            [50, 2],
            [700, 3],
            [999, 500],
        ]);
        expect(res.body.quota).toMatchObject({ unidadesLeitura: 20, unidadesRemocao: 150, cabeEmUmDia: true });
        expect(res.body.paraRemover).toContain('confirm=3');
        expect(backups()).toEqual([]);
    });
});

describe('remoção de duplicados', () => {
    it('sem confirmação, responde 409 com a prévia e não apaga nada', async () => {
        mockListing();
        const res = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates`);
        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ erro: 'confirmation_required', duplicados: 3 });
        expect(backups()).toEqual([]);
    });

    it('com confirmação diferente do que existe agora, também não apaga', async () => {
        mockListing();
        const res = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=2`);
        expect(res.status).toBe(409);
        expect(backups()).toEqual([]);
    });

    it('confirmada: grava o backup completo antes e apaga só os duplicados, um por vez', async () => {
        mockListing();
        const backupExistedBeforeDelete: boolean[] = [];
        for (const position of [50, 700, 999]) {
            nock(YOUTUBE)
                .delete('/youtube/v3/playlistItems')
                .query((q) => q.id === `item-${position}`)
                .reply(() => {
                    backupExistedBeforeDelete.push(backups().length === 1);
                    return [204, ''];
                });
        }

        const res = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ encontrados: 3, removidos: 3, falhas: [] });
        expect(backupExistedBeforeDelete).toEqual([true, true, true]);

        const backup = JSON.parse(fs.readFileSync(res.body.backup, 'utf8')) as PlaylistBackup;
        expect(backup.items).toHaveLength(1_000);
        expect(backup.removal?.removed).toEqual(['item-50', 'item-700', 'item-999']);
        expect(res.body.restaurar).toContain('npm run restore:playlist');
    });

    it('sem duplicados, não grava backup nem apaga nada', async () => {
        const items = bigPlaylist.slice(0, 40).map((item) => ({ ...item, videoId: `u${item.position}` }));
        mockListing(items);
        const res = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=0`);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ mensagem: 'Nenhum duplicado encontrado.', removidos: 0 });
        expect(backups()).toEqual([]);
    });
});

describe('leitura da playlist', () => {
    it('lista os itens com posição e título', async () => {
        mockListing(bigPlaylist.slice(0, 3));
        const res = await request(app).get(`/playlist/${PLAYLIST}/items`);
        expect(res.status).toBe(200);
        expect(res.body.itens.map((i: any) => [i.posicao, i.videoId])).toEqual([
            [0, 'v0'],
            [1, 'v1'],
            [2, 'v2'],
        ]);
    });

    it('conta os itens com uma única chamada', async () => {
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query((q) => q.part === 'id' && q.maxResults === '1')
            .reply(200, { pageInfo: { totalResults: 1_000, resultsPerPage: 1 }, items: [] });
        const res = await request(app).get(`/playlist/${PLAYLIST}`);
        expect(res.body).toEqual({ playlistId: PLAYLIST, totalItens: 1_000 });
    });

    it('playlist inexistente → 404', async () => {
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query(true)
            .reply(404, { error: { errors: [{ reason: 'playlistNotFound' }], message: 'not found' } });
        const res = await request(app).get('/playlist/PLnaoexiste/duplicates');
        expect(res.status).toBe(404);
    });

    it('quota esgotada → 429 com mensagem clara', async () => {
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query(true)
            .reply(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'quota' } });
        const res = await request(app).get(`/playlist/${PLAYLIST}/duplicates`);
        expect(res.status).toBe(429);
        expect(res.body.erro).toBe('quota_exceeded');
    });
});
