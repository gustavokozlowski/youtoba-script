import type { PlaylistJob, StoredJob } from './job-store.types';

/**
 * Guarda os jobs em memória e as promessas das execuções. Compartilhado entre os tipos de job para que
 * um job rodando numa playlist bloqueie os outros da mesma playlist.
 */
export class JobStore<J extends StoredJob> {
    private readonly jobs = new Map<string, J>();
    private readonly running = new Map<string, Promise<void>>();

    get(id: string): J | undefined {
        return this.jobs.get(id);
    }

    /** Todos os jobs desde que o servidor subiu, o mais recente primeiro. */
    list(): J[] {
        return [...this.jobs.values()].reverse();
    }

    runningFor(playlistId: string): J | undefined {
        return [...this.jobs.values()].find((job) => job.playlistId === playlistId && job.status === 'running');
    }

    /** Registra o job e a promessa da execução dele. */
    track(job: J, run: Promise<void>): void {
        this.jobs.set(job.id, job);
        this.running.set(job.id, run);
    }

    /** Resolve quando o job termina. Útil para scripts e testes. */
    settled(id: string): Promise<void> {
        return this.running.get(id) ?? Promise.resolve();
    }
}

export const playlistJobs = new JobStore<PlaylistJob>();
