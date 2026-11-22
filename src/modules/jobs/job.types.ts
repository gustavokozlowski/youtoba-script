import type { OneByOneFailure } from '../../infra/youtube/one-by-one.types';

export type JobStatus = 'running' | 'done' | 'partial' | 'failed';

/** Por que parou antes de terminar: saldo do dia (parada nossa) ou quotaExceeded do Google. */
export type JobStopReason = 'daily_budget' | 'quota_exceeded';

/** Falha de um item; `skipped_*` no `reason` é um item que nem foi tentado por falta de saldo. */
export type JobFailure = OneByOneFailure;

/** Como o fim de uma execução em série classifica o job. */
export interface JobOutcome {
    status: 'done' | 'partial';
    stopReason?: JobStopReason;
}

/** Estado de um item que não foi concluído, igual para todo tipo de job. */
export type PendingItemState = 'falhou' | 'pendente';

/** Status HTTP e corpo JSON da resposta. */
export type JobReply = [number, Record<string, unknown>];

/** Progresso de um job: total, falhas reais (sem as puladas) e o que ainda falta. */
export interface JobProgress {
    total: number;
    errors: JobFailure[];
    pending: number;
    percent: number;
}

/** O que o runner precisa do logger (só ids e contagens, nunca título nem erro HTTP bruto). */
export interface JobLog {
    info(fields: Record<string, unknown>, message: string): void;
    error(fields: Record<string, unknown>, message: string): void;
}

/** O que `runJob` atualiza em qualquer tipo de job. */
export interface RunnableJob {
    id: string;
    status: JobStatus;
    stopReason?: JobStopReason;
    error?: string;
    finishedAt?: string;
}

export interface RunJobParams {
    log: JobLog;
    /** Campos e mensagens dos logs de início e fim; `endFields` é lido só no fim. */
    messages: { start: string; end: string };
    startFields: Record<string, unknown>;
    endFields: () => Record<string, unknown>;
    /** Roda o trabalho e devolve as falhas finais. `saveProgress` grava o registro a cada item, sem nunca lançar. */
    execute: (saveProgress: () => void) => Promise<JobFailure[]>;
    /** Grava o registro do job em arquivo. */
    record: (finished: boolean) => void;
}
