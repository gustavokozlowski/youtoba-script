import { brasiliaDateTime } from '../quota/quota.formatter';
import type { QuotaSnapshot } from '../quota/quota.types';
import type { JobFailure, JobProgress, JobStatus, JobStopReason, PendingItemState } from './job.types';

export const STATUS_TEXT: Record<JobStatus, string> = {
    running: 'em andamento',
    done: 'concluída',
    partial: 'parcial',
    failed: 'interrompida por erro',
};

/** O que fazer depois de uma parada por cota, com a hora em que ela zera; `action` é "a remoção" ou "o Mix". */
const STOP_TEXT: Record<JobStopReason, (action: string, resetsAt: string) => string> = {
    daily_budget: (action, resetsAt) =>
        `A quota do dia acabou. Rode ${action} de novo depois de ${resetsAt} (horário de Brasília).`,
    quota_exceeded: (action, resetsAt) =>
        `O Google recusou por falta de quota. Rode ${action} de novo depois de ${resetsAt}.`,
};

const isSkip = (reason?: string) => reason?.startsWith('skipped_') ?? false;
export const safeCount = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Falhas de verdade: o item pulado por falta de saldo não conta, ele sai na próxima rodada. */
const realFailures = (failed: JobFailure[]) => failed.filter((f) => !isSkip(f.reason));

export function jobProgress(total: number, doneCount: number, failed: JobFailure[]): JobProgress {
    const safeTotal = safeCount(total);
    const errors = realFailures(failed);
    return {
        total: safeTotal,
        errors,
        pending: Math.max(0, safeTotal - doneCount - errors.length),
        percent: safeTotal === 0 ? 100 : Math.round((doneCount / safeTotal) * 100),
    };
}

/** Estado de cada item para a interface; `doneLabel` é a palavra do tipo de job ("apagado", "adicionado"). */
export function itemStateOf<Done extends string>(doneLabel: Done, doneIds: string[], failed: JobFailure[]) {
    const done = new Set(doneIds);
    const failedIds = new Set(realFailures(failed).map((f) => f.id));
    return (id: string): Done | PendingItemState => {
        if (done.has(id)) return doneLabel;
        if (failedIds.has(id)) return 'falhou';
        return 'pendente';
    };
}

/** `motivoParada` e `proximoPasso`, só quando o job parou por cota. */
export function stopFields(stopReason: JobStopReason | undefined, action: string, quota: QuotaSnapshot) {
    if (!stopReason) return {};
    return { motivoParada: stopReason, proximoPasso: STOP_TEXT[stopReason](action, brasiliaDateTime(quota.resetsAt)) };
}
