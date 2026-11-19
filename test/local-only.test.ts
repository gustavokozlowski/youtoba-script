import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { localOnly } from '../src/server/local-only';

// App mínima: o que importa aqui é se o pedido chega ou não às rotas.
function appWithGuard() {
    const app = express();
    app.use(localOnly());
    app.get('/', (_req, res) => res.send('ok'));
    app.get('/auth', (_req, res) => res.send('callback'));
    app.get('/quota', (_req, res) => res.json({ ok: true }));
    app.get('/playlist/with-duplicates', (_req, res) => res.json({ ok: true }));
    app.post('/auth/logout', (_req, res) => res.json({ ok: true }));
    app.delete('/playlist/:id/remove-duplicates', (_req, res) => res.json({ ok: true }));
    return app;
}

describe('localOnly', () => {
    it('deixa passar curl e scripts, que não mandam Origin nem Sec-Fetch-*', async () => {
        const app = appWithGuard();
        await request(app).get('/quota').expect(200);
        await request(app).delete('/playlist/PL1/remove-duplicates').expect(200);
        await request(app).post('/auth/logout').expect(200);
    });

    it('deixa passar a própria interface (mesma origem)', async () => {
        const app = appWithGuard();
        await request(app)
            .delete('/playlist/PL1/remove-duplicates')
            .set('Host', 'localhost:3000')
            .set('Origin', 'http://localhost:3000')
            .set('Sec-Fetch-Site', 'same-origin')
            .expect(200);
    });

    it('recusa DELETE vindo de outro site', async () => {
        const res = await request(appWithGuard())
            .delete('/playlist/PL1/remove-duplicates')
            .set('Host', 'localhost:3000')
            .set('Origin', 'https://site-malicioso.example');
        expect(res.status).toBe(403);
        expect(res.body.erro).toBe('cross_origin_blocked');
    });

    it('recusa POST de formulário vindo de outra porta do localhost', async () => {
        await request(appWithGuard())
            .post('/auth/logout')
            .set('Host', 'localhost:3000')
            .set('Origin', 'http://localhost:8080')
            .expect(403);
    });

    it('recusa Origin "null" (iframe com sandbox, arquivo local)', async () => {
        await request(appWithGuard())
            .delete('/playlist/PL1/remove-duplicates')
            .set('Host', 'localhost:3000')
            .set('Origin', 'null')
            .expect(403);
    });

    it('recusa Host que não é local (DNS rebinding)', async () => {
        const res = await request(appWithGuard()).get('/quota').set('Host', 'rebind.site-malicioso.example');
        expect(res.status).toBe(403);
        expect(res.body.erro).toBe('host_not_allowed');
    });

    it('aceita localhost, 127.0.0.1 e [::1] em qualquer porta', async () => {
        const app = appWithGuard();
        for (const host of ['localhost:3000', '127.0.0.1:5173', '[::1]:3000', 'localhost']) {
            await request(app).get('/quota').set('Host', host).expect(200);
        }
    });

    it('recusa leitura disparada por outro site (ex.: <img> gastando quota)', async () => {
        await request(appWithGuard())
            .get('/playlist/with-duplicates')
            .set('Host', 'localhost:3000')
            .set('Sec-Fetch-Site', 'cross-site')
            .set('Sec-Fetch-Mode', 'no-cors')
            .expect(403);
    });

    it('aceita a volta do login do Google e links para a página inicial', async () => {
        const app = appWithGuard();
        for (const path of ['/auth?code=abc', '/']) {
            await request(app)
                .get(path)
                .set('Host', 'localhost:3000')
                .set('Sec-Fetch-Site', 'cross-site')
                .set('Sec-Fetch-Mode', 'navigate')
                .expect(200);
        }
    });

    it('recusa navegação vinda de outro site para uma rota que gasta quota', async () => {
        await request(appWithGuard())
            .get('/playlist/with-duplicates')
            .set('Host', 'localhost:3000')
            .set('Sec-Fetch-Site', 'cross-site')
            .set('Sec-Fetch-Mode', 'navigate')
            .expect(403);
    });
});

describe('createApp', () => {
    it('usa o localOnly e não responde com CORS liberado', async () => {
        const { createApp } = await import('../src/server/app');
        const app = createApp();

        const blocked = await request(app)
            .delete('/playlist/PL1/remove-duplicates?confirm=3')
            .set('Origin', 'https://site-malicioso.example');
        expect(blocked.status).toBe(403);

        const preflight = await request(app)
            .options('/playlist/PL1/remove-duplicates')
            .set('Origin', 'https://site-malicioso.example')
            .set('Access-Control-Request-Method', 'DELETE');
        expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
    });
});
