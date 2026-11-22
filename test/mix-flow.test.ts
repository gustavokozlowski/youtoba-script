import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nock from 'nock';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { bootApp, installNetworkGuard, mockFirstLogin, mockTokenRefresh, YOUTUBE } from './helpers/flow-env';
import { login } from './helpers/login';
import { mockListing, waitForJob } from './helpers/youtube-listing';
import type { InsertBody, MixJobBody, MixPreviewBody, MixRecordFile } from './mix-flow.types';
import type { ApiItemFixture } from './playlist-flow.types';

const SOURCE = 'PLsrc';
const TARGET = 'PLtgt';

// Origem: vA e vD são novos, vB já está no destino, vC aparece duas vezes e a posição 4 é um vídeo apagado.
const sourceItems: ApiItemFixture[] = [
    { id: 's0', videoId: 'vA', position: 0 },
    { id: 's1', videoId: 'vB', position: 1 },
    { id: 's2', videoId: 'vC', position: 2 },
    { id: 's3', videoId: 'vC', position: 3 },
    { id: 's4', videoId: 'vGone', position: 4, title: 'Deleted video', videoPublishedAt: '' },
    { id: 's5', videoId: 'vD', position: 5 },
];
const targetItems: ApiItemFixture[] = [
    { id: 't0', videoId: 'vB', position: 0 },
    { id: 't1', videoId: 'vX', position: 1 },
];
const ENTRAM = ['vA', 'vC', 'vD'];

let dir: string;
let backupDir: string;
let app: Parameters<typeof request>[0];
let unmatched: string[];
let inserts: InsertBody[];

const backups = () => (fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : []);
const mixUrl = (query = `origem=${SOURCE}`, target = TARGET) => `/playlist/${target}/mix?${query}`;
const startMix = (confirm: number | string = ENTRAM.length) =>
    request(app).post(mixUrl(`origem=${SOURCE}&confirm=${confirm}`));
const mockBothListings = (source = sourceItems, target = targetItems) => {
    mockListing(source, SOURCE);
    mockListing(target, TARGET);
};

/** Mock de um insert no destino: registra o corpo e devolve o id do item criado (`new-<videoId>`). */
function mockInsert(
    videoId: string,
    { delayMs = 0, failWith }: { delayMs?: number; failWith?: { status: number; reason: string } } = {},
) {
    nock(YOUTUBE)
        .post('/youtube/v3/playlistItems', (body: InsertBody) => body.snippet?.resourceId?.videoId === videoId)
        .query(true)
        .delay(delayMs)
        .reply((_uri, body) => {
            inserts.push(body as InsertBody);
            if (failWith) return [failWith.status, { error: { errors: [{ reason: failWith.reason }], message: 'x' } }];
            return [
                200,
                {
                    kind: 'youtube#playlistItem',
                    etag: 'e',
                    id: `new-${videoId}`,
                    snippet: { playlistId: TARGET, resourceId: { kind: 'youtube#video', videoId } },
                },
            ];
        });
}

const mockInsertAll = (videoIds = ENTRAM) => {
    for (const videoId of videoIds) mockInsert(videoId);
};

async function rebootWithQuota(dailyQuota: number) {
    app = await bootApp(dailyQuota);
    mockTokenRefresh();
}

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtoba-mix-'));
    unmatched = installNetworkGuard();
});

beforeEach(async () => {
    const run = `${Date.now()}-${Math.random()}`;
    backupDir = path.join(dir, `backups-${run}`);
    process.env.BACKUP_DIR = backupDir;
    process.env.TOKEN_DB_PATH = path.join(dir, `db-${run}.db`);
    unmatched.length = 0;
    inserts = [];

    app = await bootApp();
    mockFirstLogin();
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

describe('mix dry-run', () => {
    it('plans what enters and what is skipped, with totals, quota and no write', async () => {
        mockBothListings();

        const res = await request(app).get(mixUrl());

        expect(res.status).toBe(200);
        const body = res.body as MixPreviewBody;
        expect(body.origem).toEqual({ playlistId: SOURCE, totalItens: 6 });
        expect(body.destino).toEqual({ playlistId: TARGET, totalItens: 2 });
        expect(body.entram.map((e) => e.videoId)).toEqual(ENTRAM);
        expect(body.pulados.jaNoDestino.map((e) => e.videoId)).toEqual(['vB']);
        expect(body.pulados.repetidosNaOrigem.map((e) => [e.videoId, e.posicao, e.primeiraOcorrencia])).toEqual([
            ['vC', 3, 2],
        ]);
        expect(body.pulados.indisponiveis.map((e) => [e.videoId, e.motivo])).toEqual([['vGone', 'apagado']]);
        expect(body.quota).toMatchObject({
            unidadesLeitura: 2,
            unidadesAdicao: 150,
            total: 152,
            limiteDiario: 10_000,
            cabeEmUmDia: true,
            maxAdicoesPorDia: 199,
            diasNecessarios: 1,
        });
        expect(body.quotaHoje).toMatchObject({ usado: 2, restante: 9_998, limite: 10_000 });
        expect(body.cabemHoje).toBe(3);
        expect(body.paraAdicionar).toContain(`POST /playlist/${TARGET}/mix?origem=${SOURCE}&confirm=3`);
        expect(inserts).toEqual([]);
        expect(backups()).toEqual([]);
    });

    it.each([
        ['origem missing', 'x=1', TARGET],
        ['origem with a slash', 'origem=a/b', TARGET],
        ['origem with a semicolon', 'origem=x;y', TARGET],
        ['destino with invalid chars', `origem=${SOURCE}`, 'bad.id'],
    ])('returns 400 playlist_invalida when %s, without calling YouTube', async (_name, query, target) => {
        const res = await request(app).get(mixUrl(query, target));
        expect(res.status).toBe(400);
        expect(res.body.erro).toBe('playlist_invalida');
    });

    it('returns 400 mesma_playlist when origem equals destino, without calling YouTube', async () => {
        const res = await request(app).get(mixUrl(`origem=${TARGET}`));
        expect(res.status).toBe(400);
        expect(res.body.erro).toBe('mesma_playlist');
    });
});

describe('mix start validation', () => {
    it.each([
        ['origem missing', 'confirm=3', TARGET, 'playlist_invalida'],
        ['origem with invalid chars', 'origem=x;y&confirm=3', TARGET, 'playlist_invalida'],
        ['destino with invalid chars', `origem=${SOURCE}&confirm=3`, 'bad.id', 'playlist_invalida'],
        ['same playlist', `origem=${TARGET}&confirm=3`, TARGET, 'mesma_playlist'],
    ])('POST returns 400 when %s, without calling YouTube', async (_name, query, target, erro) => {
        const res = await request(app).post(mixUrl(query, target));
        expect(res.status).toBe(400);
        expect(res.body.erro).toBe(erro);
    });

    it.each([
        ['missing', undefined],
        ['wrong', 2],
    ])(
        'returns 409 confirmation_required with the dry-run when confirm is %s, and inserts nothing',
        async (_n, confirm) => {
            mockBothListings();

            const res = await (confirm === undefined
                ? request(app).post(mixUrl())
                : request(app).post(mixUrl(`origem=${SOURCE}&confirm=${confirm}`)));

            expect(res.status).toBe(409);
            expect(res.body.erro).toBe('confirmation_required');
            expect((res.body as MixPreviewBody).entram.map((e) => e.videoId)).toEqual(ENTRAM);
            expect(inserts).toEqual([]);
            expect(backups()).toEqual([]);
        },
    );

    it('returns 200 "Nada novo para adicionar." when everything is already in the target', async () => {
        mockBothListings([{ id: 's0', videoId: 'vB', position: 0 }], [{ id: 't0', videoId: 'vB', position: 0 }]);

        const res = await startMix(0);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ mensagem: 'Nada novo para adicionar.', adicionados: 0 });
        expect(backups()).toEqual([]);
    });
});

describe('mix run', () => {
    it('appends only the planned videos to the target, in source order, and writes the record first', async () => {
        mockBothListings();
        const recordExistedBeforeInsert: boolean[] = [];
        for (const videoId of ENTRAM) {
            nock(YOUTUBE)
                .post('/youtube/v3/playlistItems', (body: InsertBody) => body.snippet?.resourceId?.videoId === videoId)
                .query(true)
                .reply((_uri, body) => {
                    recordExistedBeforeInsert.push(backups().length === 1);
                    inserts.push(body as InsertBody);
                    return [
                        200,
                        {
                            kind: 'youtube#playlistItem',
                            etag: 'e',
                            id: `new-${videoId}`,
                            snippet: { playlistId: TARGET, resourceId: { kind: 'youtube#video', videoId } },
                        },
                    ];
                });
        }

        const start = await startMix();
        expect(start.status).toBe(202);
        expect(start.body).toMatchObject({
            mensagem: 'Mix iniciado.',
            cabemHoje: 3,
            acompanhar: `/jobs/${start.body.jobId}`,
        });

        const job = await waitForJob<MixJobBody>(app, start.body.jobId);

        // Só o destino recebe escrita, sempre no fim (sem position) e nunca por DELETE (o guard 'unmatched' cobre o resto).
        expect(inserts.map((i) => i.snippet?.resourceId?.videoId)).toEqual(ENTRAM);
        for (const insert of inserts) {
            expect(insert.snippet?.playlistId).toBe(TARGET);
            expect(insert.snippet).not.toHaveProperty('position');
        }
        expect(recordExistedBeforeInsert).toEqual([true, true, true]);

        expect(job).toMatchObject({
            tipo: 'mix',
            status: 'done',
            origem: SOURCE,
            destino: TARGET,
            adicionados: 3,
            total: 3,
            progresso: '3 de 3 vídeos adicionados',
        });
        expect(job.itens.map((i) => [i.videoId, i.estado])).toEqual(ENTRAM.map((id) => [id, 'adicionado']));

        const files = backups();
        expect(files).toHaveLength(1);
        expect(files[0]).toMatch(new RegExp(`^mix-${TARGET}-.*\\.json$`));
        expect(path.resolve(job.registro)).toBe(path.join(backupDir, files[0]));
        const record = JSON.parse(fs.readFileSync(job.registro, 'utf8')) as MixRecordFile;
        expect(record).toMatchObject({ version: 1, kind: 'mix', sourceId: SOURCE, targetId: TARGET, failed: [] });
        expect(record.added).toEqual(ENTRAM.map((videoId) => ({ videoId, playlistItemId: `new-${videoId}` })));
        expect(record.finishedAt).toBeDefined();

        // 2 páginas lidas (1 cada) + 3 inserts (50 cada)
        expect((await request(app).get('/quota')).body).toMatchObject({ usado: 152 });
    });

    it('lists the mix summary in GET /jobs next to removal jobs', async () => {
        // Remoção de um duplicado no destino, e depois um Mix na mesma playlist.
        mockListing([...targetItems, { id: 't2', videoId: 'vX', position: 2 }], TARGET);
        nock(YOUTUBE)
            .delete('/youtube/v3/playlistItems')
            .query((q) => q.id === 't2')
            .reply(204, '');
        const removal = await request(app).delete(`/playlist/${TARGET}/remove-duplicates?confirm=1`);
        expect(removal.status).toBe(202);
        await waitForJob(app, removal.body.jobId);

        mockBothListings();
        mockInsertAll();
        const start = await startMix();
        await waitForJob<MixJobBody>(app, start.body.jobId);

        const res = await request(app).get('/jobs');

        expect(res.status).toBe(200);
        expect(res.body.remocoes).toHaveLength(1);
        expect(res.body.mixes).toHaveLength(1);
        expect(res.body.mixes[0]).toMatchObject({
            jobId: start.body.jobId,
            playlistId: TARGET,
            origem: SOURCE,
            tipo: 'mix',
            status: 'done',
            adicionados: 3,
            total: 3,
        });
        expect(res.body.mixes[0].itens).toBeUndefined();
        expect(res.body.remocoes[0]).toMatchObject({
            jobId: removal.body.jobId,
            playlistId: TARGET,
            status: 'done',
            removidos: 1,
            total: 1,
        });
    });
});

describe('mix lock per playlist', () => {
    it('rejects a mix while a removal runs on the target', async () => {
        mockListing([...targetItems, { id: 't2', videoId: 'vX', position: 2 }], TARGET);
        nock(YOUTUBE)
            .delete('/youtube/v3/playlistItems')
            .query((q) => q.id === 't2')
            .delay(150)
            .reply(204, '');
        const removal = await request(app).delete(`/playlist/${TARGET}/remove-duplicates?confirm=1`);
        expect(removal.status).toBe(202);

        const res = await startMix();

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ erro: 'already_running', jobId: removal.body.jobId });
        await waitForJob(app, removal.body.jobId);
    });

    it('rejects a removal while a mix runs on the playlist', async () => {
        mockBothListings();
        for (const videoId of ENTRAM) mockInsert(videoId, { delayMs: 100 });
        const start = await startMix();
        expect(start.status).toBe(202);

        const res = await request(app).delete(`/playlist/${TARGET}/remove-duplicates?confirm=1`);

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ erro: 'already_running', jobId: start.body.jobId });
        await waitForJob(app, start.body.jobId);
    });
});

describe('mix budget and failures', () => {
    it('stops at the daily budget, keeping the rest pending and only 2 in the record', async () => {
        await rebootWithQuota(120); // 2 de leitura + 2 inserts (100) = 102; o terceiro não cabe
        mockBothListings();
        mockInsert('vA');
        mockInsert('vC');

        const start = await startMix();
        expect(start.status).toBe(202);
        expect(start.body.cabemHoje).toBe(2);

        const job = await waitForJob<MixJobBody>(app, start.body.jobId);
        expect(job).toMatchObject({
            status: 'partial',
            motivoParada: 'daily_budget',
            adicionados: 2,
            total: 3,
            pendentes: 1,
        });
        expect(job.itens.map((i) => [i.videoId, i.estado])).toEqual([
            ['vA', 'adicionado'],
            ['vC', 'adicionado'],
            ['vD', 'pendente'],
        ]);
        const record = JSON.parse(fs.readFileSync(job.registro, 'utf8')) as MixRecordFile;
        expect(record.added.map((a) => a.videoId)).toEqual(['vA', 'vC']);
    });

    it('marks a failed insert as falhou and still adds the others', async () => {
        mockBothListings();
        mockInsert('vA');
        mockInsert('vC', { failWith: { status: 403, reason: 'forbidden' } });
        mockInsert('vD');

        const start = await startMix();
        const job = await waitForJob<MixJobBody>(app, start.body.jobId);

        expect(job).toMatchObject({ status: 'partial', adicionados: 2, total: 3, pendentes: 0 });
        expect(job.falhas).toEqual([{ id: 'vC', status: 403, reason: 'forbidden' }]);
        expect(job.itens.map((i) => [i.videoId, i.estado])).toEqual([
            ['vA', 'adicionado'],
            ['vC', 'falhou'],
            ['vD', 'adicionado'],
        ]);
        const record = JSON.parse(fs.readFileSync(job.registro, 'utf8')) as MixRecordFile;
        expect(record.added.map((a) => a.videoId)).toEqual(['vA', 'vD']);
        expect(record.failed).toEqual([{ id: 'vC', status: 403, reason: 'forbidden' }]);
    });
});
