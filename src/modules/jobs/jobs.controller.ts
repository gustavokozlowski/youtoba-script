import { asyncHandler } from '../../shared/async-handler';
import { quotaTracker } from '../quota/quota-tracker.service';
import { JOB_KINDS } from './job-kinds';
import type { JobGroup } from './job-kinds.types';
import { playlistJobs } from './job-store';
import type { PlaylistJob } from './job-store.types';

const NOT_FOUND = {
    erro: 'job_not_found',
    mensagem:
        'Tarefa não encontrada. Os jobs ficam em memória e somem quando o servidor reinicia; o backup guarda o que foi removido.',
};

/** Resumos agrupados por tipo, cada grupo com o mais recente primeiro. */
function summariesByGroup(jobs: PlaylistJob[]) {
    const groups: Record<JobGroup, Record<string, unknown>[]> = { remocoes: [], mixes: [] };
    for (const job of jobs) {
        const spec = JOB_KINDS[job.kind];
        groups[spec.group].push(spec.summary(job));
    }
    return groups;
}

export const getJob = asyncHandler(async (req, res) => {
    const job = playlistJobs.get(req.params.jobId);
    if (!job) return res.status(404).json(NOT_FOUND);
    return res.status(200).json(JOB_KINDS[job.kind].detail(job, quotaTracker().snapshot()));
});

export const listJobs = asyncHandler(async (_req, res) => {
    res.status(200).json(summariesByGroup(playlistJobs.list()));
});
