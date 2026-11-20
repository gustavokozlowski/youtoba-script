import path from 'node:path';
import { asyncHandler } from '../../shared/async-handler';
import { formatPreview, formatUnavailablePreview } from '../playlist/playlist.formatter';
import type { DuplicatesPreview, RemovalPreviewBase, UnavailablePreview } from '../playlist/playlist.types';
import { isReadFailure, sendReadFailure } from '../playlist/read-failure';
import { formatQuotaSnapshot } from '../quota/quota.formatter';
import type { QuotaSnapshot } from '../quota/quota.types';
import { quotaTracker } from '../quota/quota-tracker.service';
import { connectedClient } from '../quota/tracked-client';
import { backupDir, readBackup } from './backup';
import { formatJob, formatJobSummary } from './removal.formatter';
import { RemovalService } from './removal.service';
import type {
    PlaylistBackup,
    RemovalReply,
    RemovalReplySpec,
    RemovalResult,
    RemovalStarted,
    RemovalStatusResult,
} from './removal.types';
import { restoreRemoved } from './restore';

const removals = new RemovalService();

const parseConfirm = (value: unknown): number | undefined =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;

function started<P extends RemovalPreviewBase>({ job, fitToday }: RemovalStarted<P>): RemovalReply {
    const partialNote =
        fitToday < job.total
            ? ` A quota de hoje cobre ${fitToday} de ${job.total}; o resto fica para depois que ela zerar.`
            : '';
    return [
        202,
        {
            mensagem: `Remoção iniciada.${partialNote}`,
            cabemHoje: fitToday,
            acompanhar: `/jobs/${job.id}`,
            ...formatJob(job, quotaTracker().snapshot()),
        },
    ];
}

const alreadyRunningReply = (jobId: string): RemovalReply => [
    409,
    {
        erro: 'already_running',
        mensagem: 'Já existe uma remoção em andamento nesta playlist.',
        jobId,
        acompanhar: `/jobs/${jobId}`,
    },
];

function budgetExhaustedReply(snapshot: QuotaSnapshot): RemovalReply {
    const quota = formatQuotaSnapshot(snapshot);
    const mensagem = `A quota de hoje não tem saldo para remover. Tente depois de ${quota.zeraEmBrasilia} (horário de Brasília).`;
    return [429, { erro: 'daily_budget_exhausted', mensagem, quotaHoje: quota }];
}

/** Status HTTP e corpo de cada resultado da tentativa de remoção; só os textos e o dry-run mudam por tipo. */
function removalReply<P extends RemovalPreviewBase>(
    result: RemovalStatusResult<P>,
    spec: RemovalReplySpec<P>,
): RemovalReply {
    switch (result.status) {
        case 'already_running':
            return alreadyRunningReply(result.job.id);
        case 'budget_exhausted':
            return budgetExhaustedReply(result.quota);
        case 'nothing_to_remove':
            return [200, { mensagem: spec.emptyMessage, totalItens: result.itemCount, removidos: 0 }];
        case 'confirmation_required': {
            const mensagem = spec.confirmationMessage(spec.count(result));
            return [409, { erro: 'confirmation_required', mensagem, ...spec.formatPreview(result) }];
        }
        case 'started':
            return started(result);
    }
}

/** Handler de uma rota de remoção: lê o `confirm`, roda a remoção e traduz o resultado. */
function removalHandler<P extends RemovalPreviewBase>(
    remove: (playlistId: string, confirm: number | undefined) => Promise<RemovalResult<P>>,
    spec: RemovalReplySpec<P>,
) {
    return asyncHandler(async (req, res) => {
        const result = await remove(req.params.playlistId, parseConfirm(req.query.confirm));
        if (isReadFailure(result)) return sendReadFailure(res, result);
        const [status, body] = removalReply(result, spec);
        return res.status(status).json(body);
    });
}

export const removeDuplicatedItems = removalHandler<DuplicatesPreview>(
    (playlistId, confirm) => removals.removeDuplicates(playlistId, confirm),
    {
        emptyMessage: 'Nenhum duplicado encontrado.',
        confirmationMessage: (n) => `Confira os ${n} duplicados abaixo e repita com ?confirm=${n}. Nada foi removido.`,
        count: (preview) => preview.duplicates.length,
        formatPreview,
    },
);

export const removeUnavailableItems = removalHandler<UnavailablePreview>(
    (playlistId, confirm) => removals.removeUnavailable(playlistId, confirm),
    {
        emptyMessage: 'Nenhum vídeo apagado encontrado.',
        confirmationMessage: (n) =>
            `Confira os ${n} vídeos apagados abaixo e repita com ?confirm=${n}. Nada foi removido.`,
        count: (preview) => preview.deleted.length,
        formatPreview: formatUnavailablePreview,
    },
);

export const getRemovalJob = asyncHandler(async (req, res) => {
    const job = removals.job(req.params.jobId);
    if (!job) {
        return res.status(404).json({
            erro: 'job_not_found',
            mensagem:
                'Remoção não encontrada. Os jobs ficam em memória e somem quando o servidor reinicia; o backup guarda o que foi removido.',
        });
    }
    return res.status(200).json(formatJob(job, quotaTracker().snapshot()));
});

export const listRemovalJobs = asyncHandler(async (_req, res) => {
    res.status(200).json({ remocoes: removals.allJobs().map(formatJobSummary) });
});

export const restoreBackup = asyncHandler(async (req, res) => {
    const backupId = req.params.backupId;
    if (!/^[A-Za-z0-9_-]+\.json$/.test(backupId)) {
        return res.status(400).json({ erro: 'backup_invalid', mensagem: 'Backup inválido.' });
    }

    const file = path.resolve(backupDir(), backupId);
    const directory = `${path.resolve(backupDir())}${path.sep}`;
    if (!file.startsWith(directory)) {
        return res.status(400).json({ erro: 'backup_invalid', mensagem: 'Backup inválido.' });
    }

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
