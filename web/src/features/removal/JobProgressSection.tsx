import type { ReactElement } from 'react';
import { useRef } from 'react';
import type { RemovalJob, RemovalKind } from '../../shared/api/api.types';
import { num } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { LiveTracks } from './LiveTracks';
import { NoUndoPanel } from './NoUndoPanel';
import type { AsidePanelProps, JobViewProps } from './RemovalScreen.types';
import { KIND_COPY, kindOf } from './removal-kind-copy';
import { StopNotice } from './StopNotice';
import { UndoPanel } from './UndoPanel';
import { useRemovalWindow } from './use-removal-window';

// O que ficou para depois: restaurar (repetidos, dá para voltar) ou só o aviso do backup (apagados).
const ASIDE_PANELS: Record<RemovalKind, (props: AsidePanelProps) => ReactElement> = {
    duplicados: UndoPanel,
    apagados: NoUndoPanel,
};

function remainingCopy(status: RemovalJob['status'], pending: number) {
    if (status === 'done') return 'todos saíram';
    if (pending === 1) return 'ainda falta';
    return 'ainda faltam';
}

export function JobProgressSection({ job, fresh, onRestore, restoring }: JobViewProps) {
    const asideRef = useRef<HTMLElement>(null);
    const goToAside = () => asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const kind = kindOf(job.tipo);
    const copy = KIND_COPY[kind];
    const Aside = ASIDE_PANELS[kind];
    const { running, errors, current, rows } = useRemovalWindow(job);
    const pending = Math.max(0, job.pendentes);
    const completedCopy = remainingCopy(job.status, pending);

    return (
        <>
            <h1>{copy.headings[job.status]}</h1>
            <div className="live">
                <section>
                    <div className="counter">
                        <span className="big num" aria-hidden="true">
                            {num(pending)}
                        </span>
                        <span className="big-l" aria-live="polite">
                            {completedCopy}
                            <b className="num">
                                {num(job.removidos)} de {num(job.total)} apagados
                            </b>
                        </span>
                    </div>
                    <div className="track-bar" aria-hidden="true">
                        <i style={{ transform: `scaleX(${job.percentual / 100})` }} />
                    </div>
                    {current && (
                        <p className="now">
                            <i className="pulse" aria-hidden="true" />
                            <span>
                                Apagando <b>{current.titulo}</b> (#{num(current.posicao)})
                            </span>
                        </p>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm to-undo" onClick={goToAside}>
                        <Icon name="shield" />
                        {copy.shortcut}
                    </button>
                    <StopNotice job={job} errors={errors} />
                    <LiveTracks rows={rows} current={current} fresh={fresh} moving={running} />
                    {running && job.itens.length > rows.length && (
                        <p className="count">
                            Mostrando {num(rows.length)} de {num(job.itens.length)}. A lista completa aparece quando
                            terminar.
                        </p>
                    )}
                </section>
                <Aside job={job} panelRef={asideRef} onRestore={onRestore} restoring={restoring} />
            </div>
        </>
    );
}
