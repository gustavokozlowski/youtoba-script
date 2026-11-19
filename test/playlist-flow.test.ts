import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nock from 'nock';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaylistBackup } from '../src/services/youtube/youtube.types';

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
        CLIENT_ID: 'test-client.apps.googleusercontent.com',
        CLIENT_SECRET_KEY: 'test-secret',
        REDIRECT_URL: 'http://localhost:3000/auth',
        API_KEY: 'test-api-key',
        YOUTUBE_BASE_URL: `${YOUTUBE}/youtube/v3/`,
    });
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    // Qualquer chamada a um host externo sem mock (ex.: um DELETE inesperado) é registrada e falha o teste.
    nock.emitter.on('no match', (req: any) => {
        const host = req.hostname ?? req.host ?? (req.href ? new URL(req.href).hostname : '');
        if (!['127.0.0.1', 'localhost'].includes(host)) unmatched.push(`${req.method} ${host}${req.path ?? ''}`);
    });
});

async function boot({ dailyQuota = 10_000 }: { dailyQuota?: number } = {}) {
    process.env.YOUTUBE_DAILY_QUOTA = String(dailyQuota);
    vi.resetModules();
    const { createApp } = await import('../src/server/app');
    app = createApp();
}

/** Reinicia o app com outro limite de quota. O login continua salvo; o access token é renovado no Google. */
async function rebootWithQuota(dailyQuota: number) {
    await boot({ dailyQuota });
    nock(GOOGLE_OAUTH)
        .post('/token', (body) => body.grant_type === 'refresh_token')
        .reply(200, { access_token: 'at-2', token_type: 'Bearer', expires_in: 3599 });
}

/** Consulta o job até ele sair de "running". */
async function waitForJob(jobId: string) {
    for (let i = 0; i < 250; i++) {
        const res = await request(app).get(`/jobs/${jobId}`);
        if (res.body.status !== 'running') return res.body;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`job ${jobId} não terminou`);
}

const mockDelete = (position: number, reply: () => [number, unknown] = () => [204, ''], delayMs = 0) =>
    nock(YOUTUBE)
        .delete('/youtube/v3/playlistItems')
        .query((q) => q.id === `item-${position}`)
        .delay(delayMs)
        .reply(reply);

beforeEach(async () => {
    const run = `${Date.now()}-${Math.random()}`;
    backupDir = path.join(dir, `backups-${run}`);
    process.env.BACKUP_DIR = backupDir;
    process.env.TOKEN_DB_PATH = path.join(dir, `db-${run}.db`);
    unmatched = [];

    await boot();
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
        expect(res.body.quotaHoje).toMatchObject({ usado: 20, restante: 9_980, limite: 10_000 });
        expect(res.body.cabemHoje).toBe(3);
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

    it('confirmada: responde na hora com o job, grava o backup antes e apaga só os duplicados', async () => {
        mockListing();
        const backupExistedBeforeDelete: boolean[] = [];
        for (const position of [50, 700, 999]) {
            mockDelete(position, () => {
                backupExistedBeforeDelete.push(backups().length === 1);
                return [204, ''];
            });
        }

        const res = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        expect(res.status).toBe(202);
        expect(res.body).toMatchObject({ total: 3, cabemHoje: 3, acompanhar: `/jobs/${res.body.jobId}` });

        const job = await waitForJob(res.body.jobId);
        expect(job).toMatchObject({
            status: 'done',
            progresso: '3 de 3 itens apagados',
            percentual: 100,
            pendentes: 0,
        });
        expect(job.ultimoItem).toMatchObject({ posicao: 999, resultado: 'apagado' });
        expect(backupExistedBeforeDelete).toEqual([true, true, true]);

        const backup = JSON.parse(fs.readFileSync(job.backup, 'utf8')) as PlaylistBackup;
        expect(backup.items).toHaveLength(1_000);
        expect(backup.removal?.removed).toEqual(['item-50', 'item-700', 'item-999']);
        expect(backup.removal?.finishedAt).toBeDefined();

        // 20 páginas lidas (1 cada) + 3 remoções (50 cada)
        expect((await request(app).get('/quota')).body).toMatchObject({ usado: 170, restante: 9_830 });
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

describe('progresso e quota da remoção', () => {
    it('mostra o progresso enquanto apaga ("1 de 3 itens apagados")', async () => {
        mockListing();
        for (const position of [50, 700, 999]) mockDelete(position, undefined, 150);

        const start = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const during = (await request(app).get(`/jobs/${start.body.jobId}`)).body;

        expect(during.status).toBe('running');
        expect(during.situacao).toBe('em andamento');
        expect(during.progresso).toMatch(/^[0-2] de 3 itens apagados$/);

        const done = await waitForJob(start.body.jobId);
        expect(done.progresso).toBe('3 de 3 itens apagados');
    });

    it('apaga só o que cabe no saldo do dia e para antes de o Google recusar', async () => {
        await rebootWithQuota(125); // 20 da leitura + 2 remoções (100) = 120; a terceira não cabe
        mockListing();
        mockDelete(50);
        mockDelete(700);

        const start = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        expect(start.status).toBe(202);
        expect(start.body.cabemHoje).toBe(2);
        expect(start.body.mensagem).toContain('cobre 2 de 3');

        const job = await waitForJob(start.body.jobId);
        expect(job).toMatchObject({
            status: 'partial',
            motivoParada: 'daily_budget',
            progresso: '2 de 3 itens apagados',
            pendentes: 1,
            falhas: [],
        });
        expect(job.proximoPasso).toContain('quota do dia acabou');
        expect((await request(app).get('/quota')).body).toMatchObject({ usado: 120, restante: 5 });
    });

    it('sem saldo para nenhuma remoção, não grava backup nem começa', async () => {
        await rebootWithQuota(30);
        mockListing();
        const res = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        expect(res.status).toBe(429);
        expect(res.body.erro).toBe('daily_budget_exhausted');
        expect(backups()).toEqual([]);
    });

    it('sem saldo nem para ler a playlist, recusa sem chamar o YouTube', async () => {
        await boot({ dailyQuota: 0 });
        const res = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        expect(res.status).toBe(429);
        expect(res.body.quotaHoje).toMatchObject({ restante: 0 });
    });

    it('quando o Google responde quotaExceeded, para, marca o saldo como zerado e diz quando tentar de novo', async () => {
        mockListing();
        mockDelete(50);
        mockDelete(700, () => [403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'quota' } }]);

        const start = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        const job = await waitForJob(start.body.jobId);

        expect(job).toMatchObject({
            status: 'partial',
            motivoParada: 'quota_exceeded',
            progresso: '1 de 3 itens apagados',
        });
        expect(job.falhas).toEqual([{ id: 'item-700', status: 403, reason: 'quotaExceeded' }]);
        expect(job.pendentes).toBe(1);
        expect((await request(app).get('/quota')).body.restante).toBe(0);
    });

    it('não deixa começar uma segunda remoção na mesma playlist enquanto a primeira roda', async () => {
        mockListing();
        for (const position of [50, 700, 999]) mockDelete(position, undefined, 100);

        const first = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        const second = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);

        expect(second.status).toBe(409);
        expect(second.body).toMatchObject({ erro: 'already_running', jobId: first.body.jobId });
        await waitForJob(first.body.jobId);
    });

    it('job inexistente → 404', async () => {
        const res = await request(app).get('/jobs/nao-existe');
        expect(res.status).toBe(404);
    });

    it('GET /quota mostra o uso do dia e quando zera', async () => {
        const res = await request(app).get('/quota');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ usado: 0, limite: 10_000, restante: 10_000, remocoesPossiveis: 200 });
        expect(new Date(res.body.zeraEm).getTime()).toBeGreaterThan(Date.now());
    });
});
