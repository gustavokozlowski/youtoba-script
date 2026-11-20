import { vi } from 'vitest';
import type { Handler } from './fake-api.types';

/** Responde fetch por "MÉTODO /caminho" (ou só "/caminho" para GET). Caminho sem rota → 404. */
export function fakeApi(routes: Record<string, Handler>) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        const handler = routes[`${method} ${url}`] ?? (method === 'GET' ? routes[url] : undefined);
        const { status = 200, body } =
            typeof handler === 'function' ? handler() : (handler ?? { status: 404, body: {} });
        return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    });
}

export const quota = {
    dia: '2026-11-19',
    usado: 170,
    limite: 10_000,
    restante: 9_830,
    remocoesPossiveis: 196,
    zeraEm: '2026-11-20T08:00:00.000Z',
    zeraEmBrasilia: '20/11/2026, 05:00',
};

export const overview = (playlists: unknown[] = [rapNacional]) => ({
    resumo: {
        playlistsAnalisadas: 4,
        ignoradasComMenosDe2Itens: 1,
        comDuplicados: playlists.length,
        totalDuplicados: 75,
        comApagados: 0,
        totalApagados: 0,
        custoTotalRemocao: 3_750,
        custoDestaAnalise: 14,
        falhas: [],
    },
    quotaHoje: quota,
    playlists,
});

export const rapNacional = {
    playlistId: 'PLrap',
    titulo: 'rap nacional 2000s',
    capa: null,
    link: 'https://www.youtube.com/playlist?list=PLrap',
    privacidade: 'privada',
    totalVideos: 338,
    aposRemocao: 263,
    duplicados: 75,
    percentualDuplicado: 22.2,
    indisponiveis: 3,
    apagados: 0,
    maisRepetidos: [],
    custoRemocao: { unidades: 3_750, cabeHoje: true },
};
