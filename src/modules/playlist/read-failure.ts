import type { Response } from 'express';
import { apiFailure } from '../../infra/youtube/api-failure';
import { logger } from '../../shared/logger';
import type { ReadFailure } from './playlist.types';

/** Classifica o erro ao ler uma playlist do YouTube. */
export function readFailure(error: unknown): ReadFailure {
    const { status, reason } = apiFailure(error);
    if (status === 404 || reason === 'playlistNotFound') return { status: 'not_found' };
    if (reason === 'quotaExceeded') return { status: 'quota_exceeded' };
    logger.warn({ status, reason }, 'Falha ao ler a playlist');
    return { status: 'fetch_failed' };
}

const READ_FAILURES: Record<ReadFailure['status'], [number, Record<string, string>]> = {
    not_connected: [401, { erro: 'not_connected', mensagem: 'Conecte sua conta do YouTube.', login: '/auth/login' }],
    not_found: [404, { erro: 'playlist_not_found', mensagem: 'Playlist não encontrada.' }],
    quota_exceeded: [
        429,
        { erro: 'quota_exceeded', mensagem: 'A quota diária da API do YouTube acabou. Tente amanhã.' },
    ],
    fetch_failed: [502, { erro: 'playlist_fetch_failed', mensagem: 'Não foi possível ler a playlist.' }],
};

export const isReadFailure = (result: { status: string }): result is ReadFailure => result.status in READ_FAILURES;

/** Resposta HTTP de uma falha de leitura (também usada pela remoção, que lê a playlist antes). */
export const sendReadFailure = (res: Response, failure: ReadFailure) => {
    const [status, body] = READ_FAILURES[failure.status];
    return res.status(status).json(body);
};
