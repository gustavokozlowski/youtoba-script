import nock from 'nock';
import request from 'supertest';
import type { ApiItemFixture, JobBody } from '../playlist-flow.types';
import { YOUTUBE } from './flow-env';

export const hasParts = (actual: unknown, expected: string) =>
    (Array.isArray(actual) ? actual.join(',') : actual) === expected;

/** Item de playlist como o YouTube o devolve, com só o que os testes de fluxo controlam. */
export const apiItem = (item: ApiItemFixture) => ({
    kind: 'youtube#playlistItem',
    etag: 'e',
    id: item.id,
    snippet: { title: item.title ?? `Vídeo ${item.videoId}`, position: item.position, videoOwnerChannelTitle: 'Canal' },
    contentDetails: { videoId: item.videoId, videoPublishedAt: item.videoPublishedAt ?? '2020-01-01T00:00:00Z' },
});

/** Simula a listagem paginada (50 por página) e conta as chamadas. */
export function mockListing(items: ApiItemFixture[], playlistId: string) {
    const calls = { count: 0 };
    const pages = Math.max(1, Math.ceil(items.length / 50));
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

/** Consulta o job até ele sair de "running". */
export async function waitForJob<T extends { status: string } = JobBody>(
    app: Parameters<typeof request>[0],
    jobId: string,
): Promise<T> {
    for (let i = 0; i < 250; i++) {
        const res = await request(app).get(`/jobs/${jobId}`);
        if (res.body.status !== 'running') return res.body;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`job ${jobId} não terminou`);
}
