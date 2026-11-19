import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'youtoba-web-'));
fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>youtoba</title>');

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('interface servida pelo próprio servidor', () => {
    it('serve o index.html do build na raiz, sem atrapalhar a API', async () => {
        const app = createApp({ webDist: dir });
        const home = await request(app).get('/');
        expect(home.status).toBe(200);
        expect(home.text).toContain('<title>youtoba</title>');
        expect((await request(app).get('/quota')).status).toBe(200);
    });

    it('sem build, a raiz não existe e a API continua de pé', async () => {
        const app = createApp({ webDist: path.join(dir, 'nao-existe') });
        expect((await request(app).get('/')).status).toBe(404);
        expect((await request(app).get('/quota')).status).toBe(200);
    });
});
