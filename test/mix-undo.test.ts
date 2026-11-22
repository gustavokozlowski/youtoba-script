import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nock from 'nock';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { bootApp, installNetworkGuard, mockFirstLogin, YOUTUBE } from './helpers/flow-env';
import { login } from './helpers/login';
import { mockListing, waitForJob } from './helpers/youtube-listing';
import type { InsertBody, MixJobBody } from './mix-flow.types';
import type { UndoJobBody, UndoPreviewBody } from './mix-undo.types';
import type { ApiItemFixture } from './playlist-flow.types';

const SOURCE = 'PLsrc';
const TARGET = 'PLtgt';
const ADDED = ['vA', 'vC', 'vD'];
const addedId = (videoId: string) => `new-${videoId}`;

const sourceItems: ApiItemFixture[] = ADDED.map((videoId, position) => ({ id: `s${position}`, videoId, position }));
const originalTarget: ApiItemFixture[] = [
    { id: 't0', videoId: 'vB', position: 0 },
    { id: 't1', videoId: 'vX', position: 1 },
];
/** Itens que o Mix colocou no destino, como o YouTube os lista depois. */
const mixedItems = (videoIds = ADDED): ApiItemFixture[] =>
    videoIds.map((videoId, i) => ({ id: addedId(videoId), videoId, position: originalTarget.length + i }));

let dir: string;
let backupDir: string;
let app: Parameters<typeof request>[0];
let unmatched: string[];
let deletes: string[];

const files = () => (fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : []);
const undoUrl = (registro: string, confirm?: number) =>
    `/mixes/${registro}/undo${confirm === undefined ? '' : `?confirm=${confirm}`}`;

/** Mock de um insert no destino que devolve o id `new-<videoId>`. */
function mockInsert(videoId: string, delayMs = 0) {
    nock(YOUTUBE)
        .post('/youtube/v3/playlistItems', (body: InsertBody) => body.snippet?.resourceId?.videoId === videoId)
        .query(true)
        .delay(delayMs)
        .reply(200, {
            kind: 'youtube#playlistItem',
            etag: 'e',
            id: addedId(videoId),
            snippet: { playlistId: TARGET, resourceId: { kind: 'youtube#video', videoId } },
        });
}

/** Mock de um DELETE por playlistItemId; registra o id e se o backup do destino já existia. */
function mockDelete(id: string, backupFirst: boolean[] = []) {
    nock(YOUTUBE)
        .delete('/youtube/v3/playlistItems')
        .query((q) => q.id === id)
        .reply(() => {
            deletes.push(id);
            backupFirst.push(files().some((f) => f.startsWith(`${TARGET}-`)));
            return [204, ''];
        });
}

/** Roda um Mix de verdade (3 vídeos) e devolve o job e o nome do arquivo de registro. */
async function runMix(delayMs = 0) {
    mockListing(sourceItems, SOURCE);
    mockListing(originalTarget, TARGET);
    for (const videoId of ADDED) mockInsert(videoId, delayMs);
    const start = await request(app).post(`/playlist/${TARGET}/mix?origem=${SOURCE}&confirm=${ADDED.length}`);
    expect(start.status).toBe(202);
    const registro = files().find((f) => f.startsWith('mix-')) ?? '';
    return { jobId: start.body.jobId as string, registro };
}

async function runMixToEnd() {
    const mix = await runMix();
    const job = await waitForJob<MixJobBody>(app, mix.jobId);
    expect(job.status).toBe('done');
    return mix;
}

/** Grava um registro de Mix direto no BACKUP_DIR, no formato da spec. */
function writeRecord(name: string, content: Record<string, unknown> = {}) {
    fs.mkdirSync(backupDir, { recursive: true });
    const record = {
        version: 1,
        kind: 'mix',
        sourceId: SOURCE,
        targetId: TARGET,
        createdAt: '2026-11-22T00:00:00.000Z',
        planned: [],
        added: ADDED.map((videoId) => ({ videoId, playlistItemId: addedId(videoId) })),
        failed: [],
        updatedAt: '2026-11-22T00:00:00.000Z',
        finishedAt: '2026-11-22T00:00:00.000Z',
        ...content,
    };
    fs.writeFileSync(path.join(backupDir, name), JSON.stringify(record), { mode: 0o600 });
}

beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtoba-undo-'));
    unmatched = installNetworkGuard();
});

beforeEach(async () => {
    const run = `${Date.now()}-${Math.random()}`;
    backupDir = path.join(dir, `backups-${run}`);
    process.env.BACKUP_DIR = backupDir;
    process.env.TOKEN_DB_PATH = path.join(dir, `db-${run}.db`);
    unmatched.length = 0;
    deletes = [];

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

describe('mix undo record name validation', () => {
    it.each([
        ['path traversal', '..%2F.env'],
        ['no mix- prefix', 'foo.json'],
        ['wrong extension', 'mix-a.txt'],
        ['embedded traversal', 'mix-a%2F..%2Fb.json'],
    ])('returns 400 registro_invalido for %s, without calling YouTube', async (_name, registro) => {
        const res = await request(app).post(undoUrl(registro, 1));

        expect(res.status).toBe(400);
        expect(res.body.erro).toBe('registro_invalido');
        expect(res.body.mensagem).toEqual(expect.any(String));
    });
});

describe('mix undo record lookup', () => {
    it('returns 404 registro_nao_encontrado for a well-formed name that does not exist', async () => {
        const res = await request(app).post(undoUrl(`mix-${TARGET}-nope.json`, 1));

        expect(res.status).toBe(404);
        expect(res.body.erro).toBe('registro_nao_encontrado');
    });

    it('returns 404 for a removal backup renamed to a mix- name', async () => {
        fs.mkdirSync(backupDir, { recursive: true });
        const backup = { playlistId: TARGET, removed: [{ videoId: 'v1', playlistItemId: 'x' }] };
        fs.writeFileSync(path.join(backupDir, 'mix-x.json'), JSON.stringify(backup));

        const res = await request(app).post(undoUrl('mix-x.json', 1));

        expect(res.status).toBe(404);
        expect(res.body.erro).toBe('registro_nao_encontrado');
    });

    it('returns 404 for a file that is not valid JSON', async () => {
        fs.mkdirSync(backupDir, { recursive: true });
        fs.writeFileSync(path.join(backupDir, 'mix-bad.json'), '{not json');

        const res = await request(app).post(undoUrl('mix-bad.json', 1));

        expect(res.status).toBe(404);
        expect(res.body.erro).toBe('registro_nao_encontrado');
    });

    it('returns 404 for a mix record with the wrong shape (added is not a list)', async () => {
        writeRecord('mix-shape.json', { added: 'oops' });

        const res = await request(app).post(undoUrl('mix-shape.json', 1));

        expect(res.status).toBe(404);
        expect(res.body.erro).toBe('registro_nao_encontrado');
    });
});

describe('mix undo lock', () => {
    it('returns 409 already_running while the Mix itself still runs on the target', async () => {
        const mix = await runMix(100);

        const res = await request(app).post(undoUrl(mix.registro, 3));

        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ erro: 'already_running', jobId: mix.jobId });
        await waitForJob(app, mix.jobId);
    });
});

describe('mix undo preview and confirmation', () => {
    it('returns 200 "Nada para desfazer" when none of the added items is in the target anymore', async () => {
        const mix = await runMixToEnd();
        mockListing(originalTarget, TARGET);

        const res = await request(app).post(undoUrl(mix.registro, 0));

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            mensagem: 'Nada para desfazer: os vídeos deste Mix já não estão no destino.',
            removidos: 0,
        });
        expect(deletes).toEqual([]);
        expect(files().filter((f) => f.startsWith(`${TARGET}-`))).toEqual([]);
    });

    it.each([
        ['missing', undefined],
        ['wrong', 1],
    ])(
        'returns 409 confirmation_required when confirm is %s, listing only the record items present',
        async (_n, confirm) => {
            const mix = await runMixToEnd();
            // vD já saiu; sobram vA e vC do Mix.
            mockListing([...originalTarget, ...mixedItems(['vA', 'vC'])], TARGET);

            const res = await request(app).post(undoUrl(mix.registro, confirm));

            expect(res.status).toBe(409);
            const body = res.body as UndoPreviewBody;
            expect(body.erro).toBe('confirmation_required');
            expect(body.destino).toBeDefined();
            expect(body.itens.map((i) => i.playlistItemId)).toEqual([addedId('vA'), addedId('vC')]);
            expect(body.quotaHoje).toMatchObject({ limite: 10_000 });
            expect(deletes).toEqual([]);
            expect(files().filter((f) => f.startsWith(`${TARGET}-`))).toEqual([]);
        },
    );
});

describe('mix undo run', () => {
    it('deletes only the record items, keeps same-video items added elsewhere and backs up the target first', async () => {
        const mix = await runMixToEnd();
        // O dono readicionou vA por fora: mesmo videoId, outro playlistItemId; esse fica.
        const external: ApiItemFixture = { id: 'ext-vA', videoId: 'vA', position: 5 };
        mockListing([...originalTarget, ...mixedItems(), external], TARGET);
        const backupFirst: boolean[] = [];
        for (const videoId of ADDED) mockDelete(addedId(videoId), backupFirst);

        const start = await request(app).post(undoUrl(mix.registro, 3));

        expect(start.status).toBe(202);
        expect(start.body).toMatchObject({ mensagem: 'Desfazer iniciado.', tipo: 'desfazer_mix' });
        expect(start.body.acompanhar).toBe(`/jobs/${start.body.jobId}`);
        const job = await waitForJob<UndoJobBody>(app, start.body.jobId);

        expect(job).toMatchObject({ tipo: 'desfazer_mix', status: 'done', removidos: 3, total: 3 });
        expect([...deletes].sort()).toEqual(ADDED.map(addedId).sort());
        expect(deletes).not.toContain('ext-vA');
        expect(backupFirst).toEqual([true, true, true]);

        const targetBackups = files().filter((f) => f.startsWith(`${TARGET}-`));
        expect(targetBackups).toHaveLength(1);
        const content = fs.readFileSync(path.join(backupDir, targetBackups[0]), 'utf8');
        for (const id of ['t0', 't1', 'ext-vA', ...ADDED.map(addedId)]) expect(content).toContain(id);
        // O registro do Mix continua lá, intacto.
        expect(files()).toContain(mix.registro);
    });

    it('deletes only the items still present when the owner already removed one by hand', async () => {
        const mix = await runMixToEnd();
        mockListing([...originalTarget, ...mixedItems(['vA', 'vD'])], TARGET);
        mockDelete(addedId('vA'));
        mockDelete(addedId('vD'));

        const wrong = await request(app).post(undoUrl(mix.registro, 3));
        expect(wrong.status).toBe(409);
        expect((wrong.body as UndoPreviewBody).itens).toHaveLength(2);

        mockListing([...originalTarget, ...mixedItems(['vA', 'vD'])], TARGET);
        const start = await request(app).post(undoUrl(mix.registro, 2));
        expect(start.status).toBe(202);
        const job = await waitForJob<UndoJobBody>(app, start.body.jobId);

        expect(job).toMatchObject({ status: 'done', removidos: 2, total: 2 });
        expect([...deletes].sort()).toEqual([addedId('vA'), addedId('vD')]);
    });

    it('works from a hand-written record file in the spec shape', async () => {
        writeRecord('mix-PLtgt-2026-11-22.json');
        mockListing([...originalTarget, ...mixedItems(['vC'])], TARGET);
        mockDelete(addedId('vC'));

        const start = await request(app).post(undoUrl('mix-PLtgt-2026-11-22.json', 1));

        expect(start.status).toBe(202);
        const job = await waitForJob<UndoJobBody>(app, start.body.jobId);
        expect(job).toMatchObject({ tipo: 'desfazer_mix', status: 'done', removidos: 1, total: 1 });
        expect(deletes).toEqual([addedId('vC')]);
    });
});

describe('mix undo visibility and repeat safety', () => {
    it('links the undo from the Mix job and lists it under remocoes in GET /jobs', async () => {
        const mix = await runMixToEnd();
        const mixJob = (await request(app).get(`/jobs/${mix.jobId}`)).body as MixJobBody & { desfazer?: string };
        expect(mixJob.desfazer).toBe(`/mixes/${mix.registro}/undo`);

        mockListing([...originalTarget, ...mixedItems()], TARGET);
        for (const videoId of ADDED) mockDelete(addedId(videoId));
        const start = await request(app).post(undoUrl(mix.registro, 3));
        expect(start.status).toBe(202);
        await waitForJob(app, start.body.jobId);

        const res = await request(app).get('/jobs');

        expect(res.status).toBe(200);
        expect(res.body.remocoes).toHaveLength(1);
        expect(res.body.remocoes[0]).toMatchObject({
            jobId: start.body.jobId,
            playlistId: TARGET,
            tipo: 'desfazer_mix',
            status: 'done',
            removidos: 3,
            total: 3,
        });
        expect(res.body.mixes).toHaveLength(1);
    });

    it('is safe to repeat: a second undo finds nothing to undo and deletes nothing', async () => {
        const mix = await runMixToEnd();
        mockListing([...originalTarget, ...mixedItems()], TARGET);
        for (const videoId of ADDED) mockDelete(addedId(videoId));
        const start = await request(app).post(undoUrl(mix.registro, 3));
        await waitForJob(app, start.body.jobId);
        const deletedBefore = deletes.length;

        mockListing(originalTarget, TARGET);
        const again = await request(app).post(undoUrl(mix.registro, 3));

        expect(again.status).toBe(200);
        expect(again.body).toMatchObject({ removidos: 0 });
        expect(again.body.mensagem).toMatch(/^Nada para desfazer/);
        expect(deletes).toHaveLength(deletedBefore);
    });
});
