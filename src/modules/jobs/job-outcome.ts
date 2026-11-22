import type { JobFailure, JobOutcome } from './job.types';

/** Classifica o fim de uma execução em série: parada por saldo ou cota, e `done` só se nada falhou. */
export function outcomeOf(failed: JobFailure[]): JobOutcome {
    const reasons = new Set(failed.map((f) => f.reason));
    const status = failed.length === 0 ? 'done' : 'partial';
    if (reasons.has('skipped_daily_budget')) return { status, stopReason: 'daily_budget' };
    if (reasons.has('quotaExceeded')) return { status, stopReason: 'quota_exceeded' };
    return { status };
}
