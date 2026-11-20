import { asyncHandler } from '../../shared/async-handler';
import { formatPreview } from '../playlist/playlist.formatter';
import { isReadFailure, sendReadFailure } from '../playlist/read-failure';
import { formatQuotaSnapshot } from '../quota/quota.formatter';
import { quotaTracker } from '../quota/quota-tracker.service';
import { formatJob, formatJobSummary } from './removal.formatter';
import { RemovalService } from './removal.service';
import type { RemovalReply, RemovalStarted, RemovalStatusResult } from './removal.types';

const removals = new RemovalService();

const parseConfirm = (value: unknown): number | undefined =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;

function started({ job, fitToday }: RemovalStarted): RemovalReply {
    const partialNote =
        fitToday < job.total
            ? ` A quota de hoje cobre ${fitToday} de ${job.total}; o resto fica para depois que ela zerar.`
            : '';
    return [
        202,
        {
            mensagem: `Remoção iniciada.${partialNote}`,
            total: job.total,
            cabemHoje: fitToday,
            acompanhar: `/jobs/${job.id}`,
            ...formatJob(job, quotaTracker().snapshot()),
        },
    ];
}

/** Status HTTP e corpo de cada resultado da tentativa de remoção. */
function removalReply(result: RemovalStatusResult): RemovalReply {
    switch (result.status) {
        case 'already_running':
            return [
                409,
                {
                    erro: 'already_running',
                    mensagem: 'Já existe uma remoção em andamento nesta playlist.',
                    jobId: result.job.id,
                    acompanhar: `/jobs/${result.job.id}`,
                },
            ];
        case 'budget_exhausted': {
            const quota = formatQuotaSnapshot(result.quota);
            const mensagem = `A quota de hoje não tem saldo para remover. Tente depois de ${quota.zeraEmBrasilia} (horário de Brasília).`;
            return [429, { erro: 'daily_budget_exhausted', mensagem, quotaHoje: quota }];
        }
        case 'no_duplicates':
            return [200, { mensagem: 'Nenhum duplicado encontrado.', totalItens: result.itemCount, removidos: 0 }];
        case 'confirmation_required': {
            const n = result.duplicates.length;
            const mensagem = `Confira os ${n} duplicados abaixo e repita com ?confirm=${n}. Nada foi removido.`;
            return [409, { erro: 'confirmation_required', mensagem, ...formatPreview(result) }];
        }
        case 'started':
            return started(result);
    }
}

export const removeDuplicatedItems = asyncHandler(async (req, res) => {
    const result = await removals.removeDuplicates(req.params.playlistId, parseConfirm(req.query.confirm));
    if (isReadFailure(result)) return sendReadFailure(res, result);
    const [status, body] = removalReply(result);
    return res.status(status).json(body);
});

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
