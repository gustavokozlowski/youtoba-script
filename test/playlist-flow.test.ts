import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nock from 'nock';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaylistBackup } from '../src/modules/removal/removal.types';
import { login } from './helpers/login';
import type {
    ApiItemFixture,
    EntryBody,
    JobBody,
    OverviewBody,
    PreviewBody,
    UnavailableBody,
    UnmatchedRequest,
} from './playlist-flow.types';

const GOOGLE_OAUTH = 'https://oauth2.googleapis.com';
const YOUTUBE = 'https://youtube.googleapis.com';
const PLAYLIST = 'PLbig';

let dir: string;
let backupDir: string;
let app: Parameters<typeof request>[0];
let unmatched: string[] = [];

// 1.000 itens, 3 duplicados: posição 50 repete a 2 (página 1 → página 2), 700 repete a 3, 999 repete a 500.
const DUPLICATE_OF: Record<number, number> = { 50: 2, 700: 3, 999: 500 };
const hasParts = (actual: unknown, expected: string) =>
    (Array.isArray(actual) ? actual.join(',') : actual) === expected;

const bigPlaylist = Array.from({ length: 1_000 }, (_, position) => ({
    id: `item-${position}`,
    videoId: `v${DUPLICATE_OF[position] ?? position}`,
    position,
}));

const apiItem = (item: ApiItemFixture) => ({
    kind: 'youtube#playlistItem',
    etag: 'e',
    id: item.id,
    snippet: { title: item.title ?? `Vídeo ${item.videoId}`, position: item.position, videoOwnerChannelTitle: 'Canal' },
    contentDetails: { videoId: item.videoId, videoPublishedAt: item.videoPublishedAt ?? '2020-01-01T00:00:00Z' },
});

/** Simula a listagem paginada (50 por página) e conta as chamadas. */
function mockListing(items: ApiItemFixture[] = bigPlaylist, playlistId = PLAYLIST) {
    const calls = { count: 0 };
    const pages = Math.ceil(items.length / 50);
    nock(YOUTUBE)
        .get('/youtube/v3/playlistItems')
        .query(
            (q) => q.playlistId === playlistId && hasParts(q.part, 'snippet,contentDetails') && q.maxResults === '50',
        )
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

// 6 itens: apagados nas posições 1 e 3, privado na 2, e a 5 é cópia do apagado da 1 (duplicado, não "apagado").
const SMALL = 'PLsmall';
const smallPlaylist: ApiItemFixture[] = [
    { id: 'item-0', videoId: 'r0', position: 0 },
    { id: 'item-1', videoId: 'dx', position: 1, title: 'Deleted video', videoPublishedAt: '' },
    { id: 'item-2', videoId: 'pv', position: 2, title: 'Private video', videoPublishedAt: '' },
    { id: 'item-3', videoId: 'dy', position: 3, title: 'Deleted video', videoPublishedAt: '' },
    { id: 'item-4', videoId: 'r4', position: 4 },
    { id: 'item-5', videoId: 'dx', position: 5, title: 'Deleted video', videoPublishedAt: '' },
];

const backups = () => (fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : []);

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtoba-playlist-'));
    Object.assign(process.env, {
        TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
        CLIENT_ID: 'test-client.apps.googleusercontent.com',
        CLIENT_SECRET_KEY: 'test-secret',
        REDIRECT_URL: 'http://localhost:3000/auth',
        API_KEY: 'test-api-key',
    });
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    // Qualquer chamada a um host externo sem mock (ex.: um DELETE inesperado) é registrada e falha o teste.
    nock.emitter.on('no match', (req: UnmatchedRequest) => {
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
async function waitForJob(jobId: string): Promise<JobBody> {
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
    expect((await login(app)).status).toBe(302);
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
        expect(
            res.body.itensDuplicados.map((d: PreviewBody['itensDuplicados'][number]) => [
                d.posicao,
                d.primeiraOcorrencia,
            ]),
        ).toEqual([
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
        // O total vem também na consulta do job (não só na resposta 202): a tela mostra "N de total".
        expect(job).toMatchObject({
            status: 'done',
            total: 3,
            removidos: 3,
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
        expect(res.body.itens.map((i: EntryBody) => [i.posicao, i.videoId])).toEqual([
            [0, 'v0'],
            [1, 'v1'],
            [2, 'v2'],
        ]);
    });

    it('conta os itens com uma única chamada', async () => {
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query((q) => hasParts(q.part, 'id') && q.maxResults === '1')
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
        expect(job.itens.map((i: JobBody['itens'][number]) => [i.posicao, i.estado])).toEqual([
            [50, 'apagado'],
            [700, 'apagado'],
            [999, 'pendente'],
        ]);
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
        expect(job.itens.map((i: JobBody['itens'][number]) => i.estado)).toEqual(['apagado', 'falhou', 'pendente']);
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

    it('o job traz cada item com título, posição, primeira ocorrência e estado, para a interface', async () => {
        mockListing();
        for (const position of [50, 700, 999]) mockDelete(position, undefined, 150);

        const start = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        expect(start.body.itens).toHaveLength(3);
        expect(start.body.itens[0]).toEqual({
            playlistItemId: 'item-50',
            posicao: 50,
            titulo: 'Vídeo v2',
            canal: 'Canal',
            videoId: 'v2',
            primeiraOcorrencia: 2,
            estado: 'pendente',
        });

        const job = await waitForJob(start.body.jobId);
        expect(job.itens.map((i: JobBody['itens'][number]) => i.estado)).toEqual(['apagado', 'apagado', 'apagado']);
    });

    it('GET /jobs lista as remoções desta sessão do servidor, a mais recente primeiro, sem os itens', async () => {
        expect((await request(app).get('/jobs')).body).toEqual({ remocoes: [] });

        mockListing();
        for (const position of [50, 700, 999]) mockDelete(position);
        const start = await request(app).delete(`/playlist/${PLAYLIST}/remove-duplicates?confirm=3`);
        await waitForJob(start.body.jobId);

        const res = await request(app).get('/jobs');
        expect(res.status).toBe(200);
        expect(res.body.remocoes).toHaveLength(1);
        expect(res.body.remocoes[0]).toMatchObject({
            jobId: start.body.jobId,
            playlistId: PLAYLIST,
            status: 'done',
            removidos: 3,
            total: 3,
        });
        expect(res.body.remocoes[0].itens).toBeUndefined();
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

describe('playlists com duplicados', () => {
    const playlistMeta = (id: string, title: string, itemCount: number, cover?: string) => ({
        kind: 'youtube#playlist',
        etag: 'e',
        id,
        snippet: { title, thumbnails: cover ? { maxres: { url: cover, width: 1, height: 1 } } : {} },
        contentDetails: { itemCount },
        status: { privacyStatus: 'private' },
    });

    // Duas páginas de playlists: testa a paginação (1 unidade cada).
    const mockMyPlaylists = () =>
        nock(YOUTUBE)
            .get('/youtube/v3/playlists')
            .query((q) => q.mine === 'true' && hasParts(q.part, 'snippet,contentDetails,status') && !q.pageToken)
            .reply(200, {
                pageInfo: { totalResults: 5, resultsPerPage: 50 },
                items: [playlistMeta('PLa', 'Alfa', 3, 'capa-alfa'), playlistMeta('PLb', 'Beta', 5)],
                nextPageToken: 'p2',
            })
            .get('/youtube/v3/playlists')
            .query((q) => q.pageToken === 'p2')
            .reply(200, {
                pageInfo: { totalResults: 5, resultsPerPage: 50 },
                items: [
                    playlistMeta('PLc', 'Gama', 2),
                    playlistMeta('PLd', 'Delta', 1),
                    playlistMeta('PLe', 'Vazia', 0),
                ],
            });

    const mockItems = (playlistId: string, videos: { id: string; title?: string; image?: string }[]) =>
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query((q) => q.playlistId === playlistId)
            .reply(200, {
                pageInfo: { totalResults: videos.length, resultsPerPage: 50 },
                items: videos.map((v, position) => ({
                    id: `${playlistId}-${position}`,
                    snippet: {
                        title: v.title ?? `Vídeo ${v.id}`,
                        position,
                        thumbnails: v.image ? { high: { url: v.image, width: 1, height: 1 } } : {},
                    },
                    contentDetails: { videoId: v.id },
                })),
            });

    const mockAllItems = () => {
        mockItems('PLa', [{ id: 'a' }, { id: 'b' }, { id: 'a' }]);
        mockItems('PLb', [
            { id: 'x', title: 'Deleted video' },
            { id: 'v1', image: 'capa-v1' },
            { id: 'v2' },
            { id: 'v1' },
            { id: 'v1' },
        ]);
        mockItems('PLc', [{ id: 'c1' }, { id: 'c2' }]);
    };

    it('lista só as playlists com duplicados, da mais suja para a mais limpa, com capa, contagens e link', async () => {
        mockMyPlaylists();
        mockAllItems();

        const res = await request(app).get('/playlist/with-duplicates');

        expect(res.status).toBe(200);
        expect(res.body.playlists.map((p: OverviewBody['playlists'][number]) => p.playlistId)).toEqual(['PLb', 'PLa']);
        expect(res.body.playlists[0]).toMatchObject({
            titulo: 'Beta',
            capa: 'capa-v1',
            origemCapa: 'primeiro_video',
            link: 'https://www.youtube.com/playlist?list=PLb',
            privacidade: 'privada',
            totalVideos: 5,
            aposRemocao: 3,
            duplicados: 2,
            percentualDuplicado: 40,
            indisponiveis: 1,
            maisRepetidos: [{ videoId: 'v1', titulo: 'Vídeo v1', copias: 3 }],
            custoRemocao: { unidades: 100, cabeHoje: true },
            comandos: { remover: 'DELETE /playlist/PLb/remove-duplicates?confirm=2' },
        });
        expect(res.body.playlists[1]).toMatchObject({ capa: 'capa-alfa', origemCapa: 'playlist', duplicados: 1 });
        expect(res.body.resumo).toMatchObject({
            playlistsAnalisadas: 3,
            ignoradasComMenosDe2Itens: 2,
            comDuplicados: 2,
            totalDuplicados: 3,
            custoTotalRemocao: 150,
            custoDestaAnalise: 5, // 2 páginas de playlists + 3 playlists de 1 página
        });
        expect((await request(app).get('/quota')).body.usado).toBe(5);
    });

    it('com ?todas=true, mostra também as playlists sem duplicados', async () => {
        mockMyPlaylists();
        mockAllItems();

        const res = await request(app).get('/playlist/with-duplicates?todas=true');

        expect(res.body.playlists.map((p: OverviewBody['playlists'][number]) => p.playlistId)).toEqual([
            'PLb',
            'PLa',
            'PLc',
        ]);
        expect(res.body.playlists[2]).toMatchObject({ duplicados: 0, aposRemocao: 2, comandos: null });
    });

    it('counts deleted videos per playlist (without later copies) and lists playlists that only have deleted videos', async () => {
        // PLc só tem vídeo apagado (sem duplicado): precisa aparecer.
        mockMyPlaylists();
        mockItems('PLa', [{ id: 'a' }, { id: 'b' }, { id: 'a' }]);
        mockItems('PLb', [
            { id: 'x', title: 'Deleted video' },
            { id: 'v1' },
            { id: 'x', title: 'Deleted video' },
            { id: 'v1' },
        ]);
        mockItems('PLc', [{ id: 'c1' }, { id: 'd1', title: 'Deleted video' }]);

        const res = await request(app).get('/playlist/with-duplicates');

        expect(res.status).toBe(200);
        const byId = (id: string) =>
            res.body.playlists.find((p: OverviewBody['playlists'][number]) => p.playlistId === id);
        expect(res.body.playlists.map((p: OverviewBody['playlists'][number]) => p.playlistId)).toEqual([
            'PLb',
            'PLa',
            'PLc',
        ]);
        expect(byId('PLb')).toMatchObject({ duplicados: 2, apagados: 1 });
        expect(byId('PLa')).toMatchObject({ duplicados: 1, apagados: 0 });
        expect(byId('PLc')).toMatchObject({ duplicados: 0, apagados: 1 });
        expect(res.body.resumo).toMatchObject({
            comDuplicados: 2,
            totalDuplicados: 3,
            custoTotalRemocao: 150,
            comApagados: 2,
            totalApagados: 2,
        });
    });

    it('se a análise não couber no saldo do dia, recusa antes de ler os itens', async () => {
        await rebootWithQuota(4); // a lista de playlists gasta 2; ler os itens custaria mais 3
        mockMyPlaylists();

        const res = await request(app).get('/playlist/with-duplicates');

        expect(res.status).toBe(429);
        expect(res.body).toMatchObject({ erro: 'daily_budget_exhausted', custoEstimado: 3 });
    });

    it('se o Google recusar por quota no meio, devolve o que já analisou e avisa', async () => {
        mockMyPlaylists();
        mockItems('PLa', [{ id: 'a' }, { id: 'b' }, { id: 'a' }]);
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query((q) => q.playlistId === 'PLb')
            .reply(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'quota' } });

        const res = await request(app).get('/playlist/with-duplicates');

        expect(res.status).toBe(200);
        expect(res.body.playlists.map((p: OverviewBody['playlists'][number]) => p.playlistId)).toEqual(['PLa']);
        expect(res.body.resumo.aviso).toContain('incompleta');
        expect(res.body.resumo.falhas).toEqual([{ playlistId: 'PLb', titulo: 'Beta', motivo: 'quotaExceeded' }]);
        expect((await request(app).get('/quota')).body.restante).toBe(0);
    });
});

describe('deleted videos dry-run', () => {
    it('lists only deleted videos (not the private one nor the duplicate copy) and deletes nothing', async () => {
        mockListing(smallPlaylist, SMALL);

        const res = await request(app).get(`/playlist/${SMALL}/unavailable`);

        expect(res.status).toBe(200);
        const body = res.body as UnavailableBody;
        expect(body).toMatchObject({ playlistId: SMALL, totalItens: 6, apagados: 2, cabemHoje: 2 });
        expect(body.itensApagados).toEqual([
            { posicao: 1, titulo: 'Deleted video', canal: 'Canal', videoId: 'dx', playlistItemId: 'item-1' },
            { posicao: 3, titulo: 'Deleted video', canal: 'Canal', videoId: 'dy', playlistItemId: 'item-3' },
        ]);
        expect(body.quota).toMatchObject({ unidadesLeitura: 1, unidadesRemocao: 100, cabeEmUmDia: true });
        expect(body.quotaHoje).toMatchObject({ usado: 1, restante: 9_999, limite: 10_000 });
        expect(body.aviso).toMatch(/adicion/i);
        expect(backups()).toEqual([]);
    });

    it('the copy of a deleted video stays only in the duplicates list', async () => {
        mockListing(smallPlaylist, SMALL);
        const res = await request(app).get(`/playlist/${SMALL}/duplicates`);
        expect(res.body.itensDuplicados.map((d: PreviewBody['itensDuplicados'][number]) => d.posicao)).toEqual([5]);
    });

    it('returns zero when nothing is deleted', async () => {
        mockListing(bigPlaylist.slice(0, 40), SMALL);
        const res = await request(app).get(`/playlist/${SMALL}/unavailable`);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ apagados: 0, itensApagados: [] });
    });

    it('unknown playlist returns 404', async () => {
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query(true)
            .reply(404, { error: { errors: [{ reason: 'playlistNotFound' }], message: 'not found' } });
        const res = await request(app).get('/playlist/PLnaoexiste/unavailable');
        expect(res.status).toBe(404);
    });

    it('Google quotaExceeded returns 429', async () => {
        nock(YOUTUBE)
            .get('/youtube/v3/playlistItems')
            .query(true)
            .reply(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'quota' } });
        const res = await request(app).get(`/playlist/${SMALL}/unavailable`);
        expect(res.status).toBe(429);
        expect(res.body.erro).toBe('quota_exceeded');
    });
});

describe('deleted videos removal', () => {
    const url = (confirm?: number) =>
        `/playlist/${SMALL}/remove-unavailable${confirm === undefined ? '' : `?confirm=${confirm}`}`;

    it('without confirmation, returns 409 with the preview and deletes nothing', async () => {
        mockListing(smallPlaylist, SMALL);
        const res = await request(app).delete(url());
        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ erro: 'confirmation_required', apagados: 2 });
        expect(backups()).toEqual([]);
    });

    it('with a confirm different from the current count, deletes nothing', async () => {
        mockListing(smallPlaylist, SMALL);
        const res = await request(app).delete(url(3));
        expect(res.status).toBe(409);
        expect(res.body.erro).toBe('confirmation_required');
        expect(backups()).toEqual([]);
    });

    it('with no deleted videos, returns 200 without backup or deletes', async () => {
        mockListing(bigPlaylist.slice(0, 40), SMALL);
        const res = await request(app).delete(url(0));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ totalItens: 40, removidos: 0 });
        expect(typeof res.body.mensagem).toBe('string');
        expect(backups()).toEqual([]);
    });

    it('confirmed: writes the backup first and deletes only the deleted videos (not the private one nor the duplicate copy)', async () => {
        mockListing(smallPlaylist, SMALL);
        const backupExistedBeforeDelete: boolean[] = [];
        for (const position of [1, 3]) {
            mockDelete(position, () => {
                backupExistedBeforeDelete.push(backups().length === 1);
                return [204, ''];
            });
        }

        const res = await request(app).delete(url(2));
        expect(res.status).toBe(202);
        expect(res.body).toMatchObject({ total: 2, cabemHoje: 2, acompanhar: `/jobs/${res.body.jobId}` });

        const job = await waitForJob(res.body.jobId);
        expect(job).toMatchObject({
            tipo: 'apagados',
            status: 'done',
            total: 2,
            progresso: '2 de 2 itens apagados',
            percentual: 100,
            pendentes: 0,
        });
        expect(backupExistedBeforeDelete).toEqual([true, true]);

        const backup = JSON.parse(fs.readFileSync(job.backup, 'utf8')) as PlaylistBackup;
        expect(backup.items).toHaveLength(6);
        expect(backup.removal?.removed).toEqual(['item-1', 'item-3']);

        // 1 página lida + 2 remoções (50 cada)
        expect((await request(app).get('/quota')).body).toMatchObject({ usado: 101, restante: 9_899 });
    });

    it('duplicate removal on the same playlist deletes only the copy and the job type is "duplicados"', async () => {
        mockListing(smallPlaylist, SMALL);
        mockDelete(5);

        const res = await request(app).delete(`/playlist/${SMALL}/remove-duplicates?confirm=1`);
        expect(res.status).toBe(202);

        const job = await waitForJob(res.body.jobId);
        expect(job).toMatchObject({ tipo: 'duplicados', status: 'done', progresso: '1 de 1 itens apagados' });
    });

    it('rejects a second removal on the same playlist while the first runs', async () => {
        mockListing(smallPlaylist, SMALL);
        for (const position of [1, 3]) mockDelete(position, undefined, 100);

        const first = await request(app).delete(url(2));
        const second = await request(app).delete(url(2));

        expect(second.status).toBe(409);
        expect(second.body).toMatchObject({ erro: 'already_running', jobId: first.body.jobId });
        await waitForJob(first.body.jobId);
    });

    it('two simultaneous removals on the same playlist start only one job', async () => {
        // As duas leem a playlist antes de qualquer job começar: a checagem precisa valer também na hora de iniciar.
        mockListing(smallPlaylist, SMALL);
        mockListing(smallPlaylist, SMALL);
        for (const position of [1, 3]) mockDelete(position);

        const replies = await Promise.all([request(app).delete(url(2)), request(app).delete(url(2))]);

        expect(replies.map((reply) => reply.status).sort()).toEqual([202, 409]);
        const started = replies.find((reply) => reply.status === 202);
        await waitForJob(started?.body.jobId);
        expect(backups()).toHaveLength(1);
    });

    it('with no quota for any deletion, returns 429 without backup', async () => {
        await rebootWithQuota(30);
        mockListing(smallPlaylist, SMALL);
        const res = await request(app).delete(url(2));
        expect(res.status).toBe(429);
        expect(res.body.erro).toBe('daily_budget_exhausted');
        expect(backups()).toEqual([]);
    });
});
