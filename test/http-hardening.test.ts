import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app';

const LOGIN_LIMIT = 20;

describe('cabeçalhos de segurança', () => {
    it('manda uma CSP que só aceita o próprio app, mais as miniaturas do YouTube', async () => {
        const res = await request(createApp()).get('/quota');
        const csp = res.headers['content-security-policy'];
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("script-src 'self'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("frame-ancestors 'none'");
        expect(csp).toContain("img-src 'self' data: https://*.ytimg.com");
        // O servidor roda em http://localhost: subir para https quebraria os próprios arquivos.
        expect(csp).not.toContain('upgrade-insecure-requests');
    });

    it('não anuncia o Express, não deixa o navegador adivinhar tipos e não manda HSTS em http', async () => {
        const res = await request(createApp()).get('/quota');
        expect(res.headers['x-powered-by']).toBeUndefined();
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['strict-transport-security']).toBeUndefined();
    });
});

describe('limite de pedidos no login', () => {
    it(`depois de ${LOGIN_LIMIT} pedidos em 10 min, o login responde 429; o resto do app segue`, async () => {
        const app = createApp();
        for (let i = 0; i < LOGIN_LIMIT; i++) {
            expect((await request(app).get('/auth?error=access_denied')).status).toBe(400);
        }

        const blocked = await request(app).get('/auth/login');
        expect(blocked.status).toBe(429);
        expect(blocked.body.erro).toBe('too_many_requests');
        expect(blocked.body.mensagem).toMatch(/minutos/);

        expect((await request(app).get('/auth/status')).status).not.toBe(429);
        expect((await request(app).get('/quota')).status).toBe(200);
    });
});

describe('tamanho do corpo', () => {
    it('recusa JSON acima de 64 KB antes de chegar às rotas', async () => {
        const res = await request(createApp())
            .post('/auth/logout')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ ids: 'x'.repeat(70_000) }));
        expect(res.status).toBe(413);
    });
});
