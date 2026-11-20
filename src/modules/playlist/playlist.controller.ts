import { asyncHandler } from '../../shared/async-handler';
import { formatQuotaSnapshot } from '../quota/quota.formatter';
import { formatEntry, formatOverview, formatPreview } from './playlist.formatter';
import { PlaylistService } from './playlist.service';
import { isReadFailure, sendReadFailure } from './read-failure';

const playlists = new PlaylistService();

const units = (n: number) => `${n} ${n === 1 ? 'unidade' : 'unidades'}`;

export const getAllPlaylists = asyncHandler(async (_req, res) => {
    const result = await playlists.playlists();
    if (!result) return sendReadFailure(res, { status: 'not_connected' });
    return res.status(200).json({ resultado: result });
});

export const getPlaylistsWithDuplicates = asyncHandler(async (req, res) => {
    const result = await playlists.duplicatesOverview(req.query.todas === 'true');
    if (result.status === 'budget_exhausted') {
        const quota = formatQuotaSnapshot(result.quota);
        return res.status(429).json({
            erro: 'daily_budget_exhausted',
            mensagem: `A análise custaria cerca de ${units(result.estimate)} e o saldo de hoje é de ${units(quota.restante)}. Tente depois de ${quota.zeraEmBrasilia} (horário de Brasília).`,
            custoEstimado: result.estimate,
            quotaHoje: quota,
        });
    }
    if (result.status !== 'ok') return sendReadFailure(res, result);
    return res.status(200).json(formatOverview(result));
});

export const getPlaylistInfoById = asyncHandler(async (req, res) => {
    const result = await playlists.itemCount(req.params.playlistId);
    if (isReadFailure(result)) return sendReadFailure(res, result);
    return res.status(200).json({ playlistId: req.params.playlistId, totalItens: result.itemCount });
});

export const listPlaylistItems = asyncHandler(async (req, res) => {
    const result = await playlists.listItems(req.params.playlistId);
    if (isReadFailure(result)) return sendReadFailure(res, result);
    return res.status(200).json({
        playlistId: req.params.playlistId,
        totalItens: result.items.length,
        itens: result.items.map(formatEntry),
    });
});

export const previewDuplicates = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const result = await playlists.previewDuplicates(playlistId);
    if (isReadFailure(result)) return sendReadFailure(res, result);

    const n = result.duplicates.length;
    const paraRemover =
        n === 0
            ? 'Nada a remover.'
            : `DELETE /playlist/${playlistId}/remove-duplicates?confirm=${n} (um backup é gravado antes)`;
    return res.status(200).json({ ...formatPreview(result), paraRemover });
});
