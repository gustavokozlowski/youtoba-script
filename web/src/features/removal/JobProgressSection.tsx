import { useRef } from 'react';
import type { RemovalJob } from '../../shared/api/api.types';
import { num } from '../../shared/lib/format';
import { Icon } from '../../shared/ui/Icon';
import { LiveTracks } from './LiveTracks';
import type { JobViewProps } from './RemovalScreen.types';
import { StopNotice } from './StopNotice';
import { UndoPanel } from './UndoPanel';
import { useRemovalWindow } from './use-removal-window';

const HEADINGS: Record<RemovalJob['status'], string> = {
    running: 'Apagando repetidos',
    done: 'Pronto, repetidos apagados',
    partial: 'Remoção pausada',
    failed: 'A remoção parou com erro',
};

export function JobProgressSection({ job, fresh }: JobViewProps) {
    const undoRef = useRef<HTMLElement>(null);
    const goToUndo = () => undoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const { running, errors, current, rows } = useRemovalWindow(job);

    return (
        <>
            <h1>{HEADINGS[job.status]}</h1>
            <div className="live">
                <section>
                    <div className="counter">
                        <span className="big num" aria-hidden="true">
                            {num(job.pendentes)}
                        </span>
                        <span className="big-l" aria-live="polite">
                            {job.pendentes === 1 ? 'ainda falta' : 'ainda faltam'}
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
                    <button type="button" className="btn btn-ghost btn-sm to-undo" onClick={goToUndo}>
                        <Icon name="shield" />
                        Como desfazer
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
                <UndoPanel job={job} panelRef={undoRef} />
            </div>
        </>
    );
}
