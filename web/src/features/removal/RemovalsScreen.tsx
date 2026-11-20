import type { RemovalJobSummary } from '../../shared/api/api.types';
import { useJobs } from '../../shared/api/queries';
import { num, shortDateTimeLabel } from '../../shared/lib/format';
import { playlistTitle } from '../../shared/lib/overview-cache';
import { href } from '../../shared/lib/route-links';
import { Notice } from '../../shared/ui/Notice';

const STATUS_TONE: Record<RemovalJobSummary['status'], string> = {
    running: 'pill-live',
    done: 'pill-ok',
    partial: 'pill-warn',
    failed: 'pill-error',
};

export function RemovalsScreen() {
    const { data: jobs, error } = useJobs();

    return (
        <main>
            <div className="head">
                <div>
                    <h1>Remoções</h1>
                    <p className="lead">As remoções desde que o servidor ligou. Cada uma tem o seu backup.</p>
                </div>
            </div>
            {error && (
                <Notice tone="error" title="Não consegui listar as remoções">
                    {error.message}
                </Notice>
            )}
            {jobs && jobs.length === 0 && (
                <div className="empty">
                    <h2>Nenhuma remoção ainda</h2>
                    <p>
                        Nenhuma remoção desde que o servidor ligou. Escolha uma playlist, revise os repetidos e
                        confirme: o progresso aparece aqui.
                    </p>
                    <a className="btn btn-primary" href={href.playlists()}>
                        Ver playlists
                    </a>
                </div>
            )}
            {jobs && jobs.length > 0 && (
                <ul className="list">
                    {jobs.map((job) => (
                        <li className="job" key={job.jobId}>
                            <div>
                                <a className="pl-title" href={href.removal(job.jobId)}>
                                    {playlistTitle(job.playlistId)}
                                </a>
                                <div className="pl-meta">começou {shortDateTimeLabel(job.iniciadoEm)}</div>
                            </div>
                            <span className="num job-count">
                                {num(job.removidos)} de {num(job.total)}
                            </span>
                            <span className={`pill ${STATUS_TONE[job.status]}`}>{job.situacao}</span>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
