import type { Request, Response } from 'express';
import { quotaTracker } from '../services/youtube/quota-tracker';
import type { ReadFailure } from '../services/youtube/youtube.types';
import { YoutubeService } from '../services/youtube/youtube-playlist.services';
import { formatEntry, formatJob, formatPreview, formatQuotaSnapshot } from './formatters';

const youtubeService = new YoutubeService();

const READ_FAILURES: Record<ReadFailure['status'], [number, Record<string, string>]> = {
    not_connected: [401, { erro: 'not_connected', mensagem: 'Conecte sua conta do YouTube.', login: '/auth/login' }],
    not_found: [404, { erro: 'playlist_not_found', mensagem: 'Playlist não encontrada.' }],
    quota_exceeded: [
        429,
        { erro: 'quota_exceeded', mensagem: 'A quota diária da API do YouTube acabou. Tente amanhã.' },
    ],
    fetch_failed: [502, { erro: 'playlist_fetch_failed', mensagem: 'Não foi possível ler a playlist.' }],
};

const isReadFailure = (result: { status: string }): result is ReadFailure => result.status in READ_FAILURES;

const sendReadFailure = (res: Response, failure: ReadFailure) => {
    const [status, body] = READ_FAILURES[failure.status];
    return res.status(status).json(body);
};

const parseConfirm = (value: unknown): number | undefined =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;

const internalError = (res: Response, context: string, e: any) => {
    console.error(`Erro ao ${context}:`, e?.message);
    return res.status(500).json({ erro: 'internal_error' });
};

export const getAllPlaylists = async (_req: Request, res: Response) => {
    try {
        const result = await youtubeService.playlists();
        if (!result) {
            return sendReadFailure(res, { status: 'not_connected' });
        }
        return res.status(200).json({ resultado: result });
    } catch (e) {
        return internalError(res, 'obter playlists', e);
    }
};

export const getPlaylistInfoById = async (req: Request, res: Response) => {
    try {
        const result = await youtubeService.itemCount(req.params.playlistId);
        if (isReadFailure(result)) return sendReadFailure(res, result);
        return res.status(200).json({ playlistId: req.params.playlistId, totalItens: result.itemCount });
    } catch (e) {
        return internalError(res, 'obter detalhes da playlist', e);
    }
};

export const listPlaylistItems = async (req: Request, res: Response) => {
    try {
        const result = await youtubeService.listItems(req.params.playlistId);
        if (isReadFailure(result)) return sendReadFailure(res, result);
        return res.status(200).json({
            playlistId: req.params.playlistId,
            totalItens: result.items.length,
            itens: result.items.map(formatEntry),
        });
    } catch (e) {
        return internalError(res, 'listar itens da playlist', e);
    }
};

export const previewDuplicates = async (req: Request, res: Response) => {
    try {
        const { playlistId } = req.params;
        const result = await youtubeService.previewDuplicates(playlistId);
        if (isReadFailure(result)) return sendReadFailure(res, result);

        const n = result.duplicates.length;
        return res.status(200).json({
            ...formatPreview(result),
            paraRemover:
                n === 0
                    ? 'Nada a remover.'
                    : `DELETE /playlist/${playlistId}/remove-duplicates?confirm=${n} (um backup é gravado antes)`,
        });
    } catch (e) {
        return internalError(res, 'procurar duplicados', e);
    }
};

export const removeDuplicatedItems = async (req: Request, res: Response) => {
    try {
        const { playlistId } = req.params;
        const result = await youtubeService.removeDuplicates(playlistId, parseConfirm(req.query.confirm));

        if (isReadFailure(result)) return sendReadFailure(res, result);

        switch (result.status) {
            case 'already_running':
                return res.status(409).json({
                    erro: 'already_running',
                    mensagem: 'Já existe uma remoção em andamento nesta playlist.',
                    jobId: result.job.id,
                    acompanhar: `/jobs/${result.job.id}`,
                });
            case 'budget_exhausted':
                return res.status(429).json({
                    erro: 'daily_budget_exhausted',
                    mensagem: `A quota de hoje não tem saldo para remover. Tente depois de ${formatQuotaSnapshot(result.quota).zeraEmBrasilia} (horário de Brasília).`,
                    quotaHoje: formatQuotaSnapshot(result.quota),
                });
            case 'no_duplicates':
                return res
                    .status(200)
                    .json({ mensagem: 'Nenhum duplicado encontrado.', totalItens: result.itemCount, removidos: 0 });
            case 'confirmation_required': {
                const n = result.duplicates.length;
                return res.status(409).json({
                    erro: 'confirmation_required',
                    mensagem: `Confira os ${n} duplicados abaixo e repita com ?confirm=${n}. Nada foi removido.`,
                    ...formatPreview(result),
                });
            }
        }

        const { job, fitToday } = result;
        const partialNote =
            fitToday < job.total
                ? ` A quota de hoje cobre ${fitToday} de ${job.total}; o resto fica para depois que ela zerar.`
                : '';
        return res.status(202).json({
            mensagem: `Remoção iniciada.${partialNote}`,
            total: job.total,
            cabemHoje: fitToday,
            acompanhar: `/jobs/${job.id}`,
            ...formatJob(job, quotaTracker().snapshot()),
        });
    } catch (e) {
        return internalError(res, 'remover duplicados', e);
    }
};

export const getRemovalJob = (req: Request, res: Response) => {
    const job = youtubeService.job(req.params.jobId);
    if (!job) {
        return res.status(404).json({
            erro: 'job_not_found',
            mensagem:
                'Remoção não encontrada. Os jobs ficam em memória e somem quando o servidor reinicia; o backup guarda o que foi removido.',
        });
    }
    return res.status(200).json(formatJob(job, quotaTracker().snapshot()));
};

export const getQuota = (_req: Request, res: Response) => {
    res.status(200).json(formatQuotaSnapshot(quotaTracker().snapshot()));
};
