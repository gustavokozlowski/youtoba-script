import { useJob, useRestoreBackup } from '../../shared/api/queries';
import { playlistTitle } from '../../shared/lib/overview-cache';
import { href } from '../../shared/lib/route-links';
import { ApiErrorNotice } from '../../shared/ui/ApiErrorNotice';
import { JobProgressSection } from './JobProgressSection';
import type { RemovalScreenProps } from './RemovalScreen.types';
import { useNewlyRemoved } from './use-newly-removed';

export function RemovalScreen({ jobId }: RemovalScreenProps) {
    const { data: job, error } = useJob(jobId);
    const restore = useRestoreBackup();
    const fresh = useNewlyRemoved(job);
    const title = job ? playlistTitle(job.playlistId) : '';

    return (
        <main>
            <p className="crumb">
                <a href={href.removals()}>Remoções</a>
                {job && (
                    <>
                        {' / '}
                        <a href={href.review(job.playlistId)}>{title}</a>
                    </>
                )}
            </p>
            {error && (
                <ApiErrorNotice
                    error={error}
                    fallbackTitle="Não consegui acompanhar a remoção"
                    notFound={{
                        code: 'job_not_found',
                        title: 'Não encontrei essa remoção',
                        message:
                            'O progresso fica na memória do servidor e some quando ele reinicia. O que saiu continua registrado no arquivo de backup, na pasta backups/.',
                    }}
                />
            )}
            {!job && !error && <div className="skeleton" style={{ height: 220 }} aria-busy="true" />}
            {job && (
                <JobProgressSection
                    job={job}
                    fresh={fresh}
                    onRestore={() => restore.mutate(job.backup)}
                    restoring={restore.isPending}
                />
            )}
            {restore.isSuccess && <p className="notice notice-ok">Restauração concluída.</p>}
            {restore.error && <ApiErrorNotice error={restore.error} fallbackTitle="Não consegui restaurar o backup" />}
        </main>
    );
}
