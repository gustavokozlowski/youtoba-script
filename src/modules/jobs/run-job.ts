import { errorMessage } from '../../shared/errors';
import type { JobLog, RunJobParams, RunnableJob } from './job.types';
import { outcomeOf } from './job-outcome';

/** Grava o registro sem deixar a falha escapar: arquivo apagado ou disco cheio não pode derrubar o servidor. */
function guardedRecord(job: RunnableJob, record: RunJobParams['record'], log: JobLog, finished: boolean) {
    try {
        record(finished);
    } catch (error) {
        log.error({ job: job.id.slice(0, 8), mensagem: errorMessage(error) }, 'Falha ao gravar o registro do job');
    }
}

/**
 * Esqueleto de toda execução em segundo plano: loga o início, roda, classifica o fim (done, partial ou failed)
 * e grava o registro final. A promessa devolvida nunca rejeita.
 */
export async function runJob(job: RunnableJob, params: RunJobParams): Promise<void> {
    const { log, messages, execute, record } = params;
    log.info(params.startFields, messages.start);

    try {
        const failed = await execute(() => guardedRecord(job, record, log, false));
        Object.assign(job, outcomeOf(failed));
    } catch (error) {
        job.status = 'failed';
        job.error = errorMessage(error);
    }
    job.finishedAt = new Date().toISOString();
    guardedRecord(job, record, log, true);
    log.info(params.endFields(), messages.end);
}
