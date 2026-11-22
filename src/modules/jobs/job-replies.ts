import type { Response } from 'express';
import { formatQuotaSnapshot } from '../quota/quota.formatter';
import type { QuotaSnapshot } from '../quota/quota.types';
import type { JobReply } from './job.types';
import type { PlaylistJob } from './job-store.types';

/** Quem está rodando, para a mensagem do 409. */
const RUNNING_TEXT: Record<PlaylistJob['kind'], string> = {
    duplicates: 'uma remoção',
    unavailable: 'uma remoção',
    mix: 'um Mix',
};

export const alreadyRunningReply = (job: PlaylistJob): JobReply => [
    409,
    {
        erro: 'already_running',
        mensagem: `Já existe ${RUNNING_TEXT[job.kind]} em andamento nesta playlist.`,
        jobId: job.id,
        acompanhar: `/jobs/${job.id}`,
    },
];

/** `action` completa "não tem saldo para ...": "remover", "adicionar". */
export function budgetExhaustedReply(snapshot: QuotaSnapshot, action: string): JobReply {
    const quota = formatQuotaSnapshot(snapshot);
    const mensagem = `A quota de hoje não tem saldo para ${action}. Tente depois de ${quota.zeraEmBrasilia} (horário de Brasília).`;
    return [429, { erro: 'daily_budget_exhausted', mensagem, quotaHoje: quota }];
}

export const sendReply = (res: Response, [status, body]: JobReply) => res.status(status).json(body);
