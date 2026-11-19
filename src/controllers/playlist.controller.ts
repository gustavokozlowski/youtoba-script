import type { Request, Response } from 'express';
import type {
    DuplicateEntry,
    DuplicatesPreview,
    PlaylistEntry,
    ReadFailure,
    RemovalQuotaEstimate,
} from '../services/youtube/youtube.types';
import { YoutubeService } from '../services/youtube/youtube-playlist.services';

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

const formatEntry = (entry: PlaylistEntry) => ({
    posicao: entry.position,
    titulo: entry.title,
    canal: entry.channel,
    videoId: entry.videoId,
    playlistItemId: entry.playlistItemId,
});

const formatDuplicate = (entry: DuplicateEntry) => ({ ...formatEntry(entry), primeiraOcorrencia: entry.firstPosition });

const formatQuota = (quota: RemovalQuotaEstimate) => ({
    unidadesLeitura: quota.listUnits,
    unidadesRemocao: quota.deleteUnits,
    total: quota.total,
    limiteDiario: quota.dailyLimit,
    cabeEmUmDia: quota.fitsInOneDay,
    maxRemocoesPorDia: quota.maxDeletesPerDay,
    diasNecessarios: quota.daysNeeded,
    observacao: 'A estimativa não sabe quanto da quota de hoje já foi gasto.',
});

const formatPreview = (preview: DuplicatesPreview) => ({
    playlistId: preview.playlistId,
    totalItens: preview.itemCount,
    ficam: preview.unique,
    duplicados: preview.duplicates.length,
    itensDuplicados: preview.duplicates.map(formatDuplicate),
    quota: formatQuota(preview.quota),
});

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

        if (result.status === 'no_duplicates') {
            return res
                .status(200)
                .json({ mensagem: 'Nenhum duplicado encontrado.', totalItens: result.itemCount, removidos: 0 });
        }

        if (result.status === 'confirmation_required') {
            const n = result.duplicates.length;
            return res.status(409).json({
                erro: 'confirmation_required',
                mensagem: `Confira os ${n} duplicados abaixo e repita com ?confirm=${n}. Nada foi removido.`,
                ...formatPreview(result),
            });
        }

        const { removed, failed, backupFile } = result;
        const body = {
            encontrados: result.duplicates.length,
            removidos: removed.length,
            falhas: failed,
            backup: backupFile,
            restaurar: `npm run restore:playlist -- ${backupFile}`,
        };

        if (failed.length === 0) {
            return res.status(200).json({ mensagem: 'Duplicados removidos.', ...body });
        }

        // 207: remoção parcial; 502: nada foi removido.
        return res.status(removed.length > 0 ? 207 : 502).json({
            mensagem: removed.length > 0 ? 'Remoção parcial: alguns itens falharam.' : 'Nenhum item foi removido.',
            ...body,
        });
    } catch (e) {
        return internalError(res, 'remover duplicados', e);
    }
};
