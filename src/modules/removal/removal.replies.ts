import type { JobReply } from '../jobs/job.types';
import { alreadyRunningReply, budgetExhaustedReply } from '../jobs/job-replies';
import type { RemovalPreviewBase } from '../playlist/playlist.types';
import { quotaTracker } from '../quota/quota-tracker.service';
import { formatJob } from './removal.formatter';
import type { RemovalReplySpec, RemovalStarted, RemovalStatusResult } from './removal.types';

function started<P extends RemovalPreviewBase>({ job, fitToday }: RemovalStarted<P>, message: string): JobReply {
    const partialNote =
        fitToday < job.total
            ? ` A quota de hoje cobre ${fitToday} de ${job.total}; o resto fica para depois que ela zerar.`
            : '';
    return [
        202,
        {
            mensagem: `${message}${partialNote}`,
            cabemHoje: fitToday,
            acompanhar: `/jobs/${job.id}`,
            ...formatJob(job, quotaTracker().snapshot()),
        },
    ];
}

/** Status HTTP e corpo de cada resultado da tentativa de remoção; só os textos e o dry-run mudam por tipo. */
export function removalReply<P extends RemovalPreviewBase>(
    result: RemovalStatusResult<P>,
    spec: RemovalReplySpec<P>,
): JobReply {
    switch (result.status) {
        case 'already_running':
            return alreadyRunningReply(result.job);
        case 'budget_exhausted':
            return budgetExhaustedReply(result.quota, 'remover');
        case 'nothing_to_remove':
            return [200, { mensagem: spec.emptyMessage, totalItens: result.itemCount, removidos: 0 }];
        case 'confirmation_required': {
            const mensagem = spec.confirmationMessage(spec.count(result));
            return [409, { erro: 'confirmation_required', mensagem, ...spec.formatPreview(result) }];
        }
        case 'started':
            return started(result, spec.startedMessage);
    }
}
