import { asyncHandler } from '../../shared/async-handler';
import { parseConfirm } from '../jobs/confirm';
import { sendReply } from '../jobs/job-replies';
import { formatPreview, formatUnavailablePreview } from '../playlist/playlist.formatter';
import type { DuplicatesPreview, RemovalPreviewBase, UnavailablePreview } from '../playlist/playlist.types';
import { isReadFailure, sendReadFailure } from '../playlist/read-failure';
import { connectedClient } from '../quota/tracked-client';
import { BACKUP_NAME, readBackup, resolveRecordFile } from './backup';
import { removalReply } from './removal.replies';
import { RemovalService } from './removal.service';
import type { PlaylistBackup, RemovalReplySpec, RemovalResult } from './removal.types';
import { restoreRemoved } from './restore';

const removals = new RemovalService();

/** Handler de uma rota de remoção: lê o `confirm`, roda a remoção e traduz o resultado. */
function removalHandler<P extends RemovalPreviewBase>(
    remove: (playlistId: string, confirm: number | undefined) => Promise<RemovalResult<P>>,
    spec: RemovalReplySpec<P>,
) {
    return asyncHandler(async (req, res) => {
        const result = await remove(req.params.playlistId, parseConfirm(req.query.confirm));
        if (isReadFailure(result)) return sendReadFailure(res, result);
        return sendReply(res, removalReply(result, spec));
    });
}

export const removeDuplicatedItems = removalHandler<DuplicatesPreview>(
    (playlistId, confirm) => removals.removeDuplicates(playlistId, confirm),
    {
        startedMessage: 'Remoção iniciada.',
        emptyMessage: 'Nenhum duplicado encontrado.',
        confirmationMessage: (n) => `Confira os ${n} duplicados abaixo e repita com ?confirm=${n}. Nada foi removido.`,
        count: (preview) => preview.duplicates.length,
        formatPreview,
    },
);

export const removeUnavailableItems = removalHandler<UnavailablePreview>(
    (playlistId, confirm) => removals.removeUnavailable(playlistId, confirm),
    {
        startedMessage: 'Remoção iniciada.',
        emptyMessage: 'Nenhum vídeo apagado encontrado.',
        confirmationMessage: (n) =>
            `Confira os ${n} vídeos apagados abaixo e repita com ?confirm=${n}. Nada foi removido.`,
        count: (preview) => preview.deleted.length,
        formatPreview: formatUnavailablePreview,
    },
);

export const restoreBackup = asyncHandler(async (req, res) => {
    const file = resolveRecordFile(req.params.backupId, BACKUP_NAME);
    if (!file) return res.status(400).json({ erro: 'backup_invalid', mensagem: 'Backup inválido.' });

    let backup: PlaylistBackup;
    try {
        backup = readBackup(file);
    } catch {
        return res.status(404).json({ erro: 'backup_not_found', mensagem: 'Backup não encontrado.' });
    }

    const client = await connectedClient();
    if (!client) {
        return res.status(401).json({
            erro: 'not_connected',
            mensagem: 'Conta não conectada. Entre com o Google antes de restaurar.',
        });
    }

    const result = await restoreRemoved(client, backup);
    return res.status(200).json({
        mensagem: 'Restauração concluída.',
        restaurados: result.restored.length,
        jaPresentes: result.skipped.length,
        falhas: result.failed,
    });
});
