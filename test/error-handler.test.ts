import { Writable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server/app';
import { errorHandler } from '../src/server/error-handler';
import { createLogger } from '../src/shared/logger';

const TOKEN = 'ya29.token-que-nao-pode-vazar';

/** Um erro HTTP: carrega o header Authorization na config. */
const httpLikeError = () =>
    Object.assign(new Error('Request failed with status code 503'), {
        config: { headers: { Authorization: `Bearer ${TOKEN}` } },
        response: { status: 503, data: { error: { message: 'Backend Error' } } },
    });

function appThatThrows(error: unknown) {
    const log = { error: vi.fn() };
    const app = express();
    app.get('/quebra', () => {
        throw error;
    });
    app.use(errorHandler(log));
    return { app, log };
}

describe('tratador de erro único', () => {
    it('erro inesperado vira 500 genérico, e o log leva a mensagem e o status, nunca o token', async () => {
        const { app, log } = appThatThrows(httpLikeError());
        const res = await request(app).get('/quebra');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ erro: 'internal_error', mensagem: 'Erro interno. Veja o terminal do servidor.' });
        expect(log.error).toHaveBeenCalledOnce();
        const logged = JSON.stringify(log.error.mock.calls[0]);
        expect(logged).toContain('Request failed with status code 503');
        expect(logged).toContain('/quebra');
        expect(logged).not.toContain(TOKEN);
    });

    it('JSON inválido no corpo vira 400 com mensagem, sem log de erro', async () => {
        const res = await request(createApp())
            .post('/auth/logout')
            .set('Content-Type', 'application/json')
            .send('{"quebrado":');
        expect(res.status).toBe(400);
        expect(res.body.erro).toBe('invalid_json');
    });

    it('corpo grande demais vira 413 com mensagem', async () => {
        const res = await request(createApp())
            .post('/auth/logout')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ ids: 'x'.repeat(70_000) }));
        expect(res.status).toBe(413);
        expect(res.body.erro).toBe('payload_too_large');
    });
});

describe('logger', () => {
    it('apaga header de autorização e tokens mesmo se alguém logar o objeto inteiro', () => {
        let output = '';
        const sink = new Writable({
            write(chunk, _encoding, done) {
                output += chunk;
                done();
            },
        });
        const log = createLogger({ level: 'info' }, sink);
        log.info(
            {
                headers: { authorization: `Bearer ${TOKEN}` },
                config: { headers: { Authorization: `Bearer ${TOKEN}` } },
                tokens: { access_token: TOKEN, refresh_token: TOKEN },
            },
            'teste',
        );
        expect(output).toContain('teste');
        expect(output).not.toContain(TOKEN);
    });
});
