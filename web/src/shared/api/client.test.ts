import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, UNAUTHORIZED_EVENT } from './client';

const reply = (status: number, body: unknown) =>
    vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
            new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
        );

afterEach(() => vi.restoreAllMocks());

describe('api', () => {
    it('devolve o JSON quando dá certo', async () => {
        reply(200, { connected: true });
        await expect(api.get('/auth/status')).resolves.toEqual({ connected: true });
    });

    it('transforma a resposta de erro em ApiError com status, código e mensagem do servidor', async () => {
        reply(429, { erro: 'quota_exceeded', mensagem: 'A quota diária acabou.' });
        const error = (await api.get('/quota').catch((e) => e)) as ApiError;
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 429, code: 'quota_exceeded', message: 'A quota diária acabou.' });
    });

    it('avisa a aplicação quando o login expira (401)', async () => {
        reply(401, { erro: 'not_connected', mensagem: 'Conecte sua conta do YouTube.' });
        const listener = vi.fn();
        window.addEventListener(UNAUTHORIZED_EVENT, listener);
        await api.get('/playlist/with-duplicates').catch(() => undefined);
        window.removeEventListener(UNAUTHORIZED_EVENT, listener);
        expect(listener).toHaveBeenCalledOnce();
    });

    it('sem resposta do servidor, diz que ele está desligado', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        const error = (await api.get('/quota').catch((e) => e)) as ApiError;
        expect(error).toMatchObject({ status: 0, code: 'offline' });
        expect(error.message).toContain('npm run dev');
    });

    it('envia DELETE e POST pela mesma porta', async () => {
        const fetchMock = reply(202, { jobId: 'j1' });
        await api.send('DELETE', '/playlist/PL1/remove-duplicates?confirm=3');
        expect(fetchMock).toHaveBeenCalledWith(
            '/playlist/PL1/remove-duplicates?confirm=3',
            expect.objectContaining({ method: 'DELETE' }),
        );
    });
});
