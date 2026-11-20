import { type RefObject, useRef, useState } from 'react';
import type { RemovalJob } from '../api/api.types';
import type { ApiError } from '../api/client';
import { useJob } from '../api/queries';
import { Icon } from '../components/Icon';
import { LiveTracks } from '../components/LiveTracks';
import { Notice } from '../components/Notice';
import { SprayFilter } from '../components/TrackRow';
import { num } from '../lib/format';
import { findPlaylist } from '../lib/overview-cache';
import { href } from '../lib/router';

// Enquanto apaga, mostra só a janela em volta do item atual: os últimos apagados e os próximos.
const WINDOW_BEFORE = 4;
const WINDOW_SIZE = 9;

export function Remocao({ jobId }: { jobId: string }) {
    const { data: job, error } = useJob(jobId);
    const fresh = useNewlyRemoved(job);

    const title = job ? (findPlaylist(job.playlistId)?.titulo ?? job.playlistId) : '';

    return (
        <main>
            <SprayFilter />
            <p className="crumb">
                <a href={href.removals()}>Remoções</a>
                {job && (
                    <>
                        {' / '}
                        <a href={href.review(job.playlistId)}>{title}</a>
                    </>
                )}
            </p>
            {error && <JobError error={error} />}
            {!job && !error && <div className="skeleton" style={{ height: 220 }} aria-busy="true" />}
            {job && <JobView job={job} fresh={fresh} />}
        </main>
    );
}

const removedIds = (job: RemovalJob) =>
    new Set(job.itens.filter((i) => i.estado === 'apagado').map((i) => i.playlistItemId));

/**
 * Itens que passaram a "apagado" na última consulta: o risco só anima para o que sai com a tela
 * aberta. Guarda a leitura anterior e compara durante a renderização, sem efeito.
 */
function useNewlyRemoved(job: RemovalJob | undefined) {
    const [previous, setPrevious] = useState(job);
    const [fresh, setFresh] = useState<Set<string>>(() => new Set());
    if (job !== previous) {
        setPrevious(job);
        const before = previous ? removedIds(previous) : undefined;
        setFresh(job && before ? new Set([...removedIds(job)].filter((id) => !before.has(id))) : new Set());
    }
    return fresh;
}

const HEADINGS: Record<RemovalJob['status'], string> = {
    running: 'Apagando repetidos',
    done: 'Pronto, repetidos apagados',
    partial: 'Remoção pausada',
    failed: 'A remoção parou com erro',
};

function JobView({ job, fresh }: { job: RemovalJob; fresh: Set<string> }) {
    const undoRef = useRef<HTMLElement>(null);
    // No celular o painel de desfazer fica depois da lista: o atalho leva até ele.
    const goToUndo = () => undoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const running = job.status === 'running';
    const errors = job.falhas.filter((f) => !f.reason?.startsWith('skipped_'));
    const current = running ? job.itens.find((i) => i.estado === 'pendente') : undefined;
    const doneCount = job.itens.findIndex((i) => i.estado === 'pendente');
    const start = Math.max(0, (doneCount === -1 ? job.itens.length : doneCount) - WINDOW_BEFORE);
    const rows = running ? job.itens.slice(start, start + WINDOW_SIZE) : job.itens;

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
                    <StopNotice job={job} errors={errors.length} />
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

function StopNotice({ job, errors }: { job: RemovalJob; errors: number }) {
    if (job.status === 'done') {
        return (
            <Notice
                tone="warn"
                title={`${num(job.removidos)} ${job.removidos === 1 ? 'vídeo repetido saiu' : 'vídeos repetidos saíram'}`}
            >
                A primeira vez de cada vídeo continua na playlist, na ordem de antes.
            </Notice>
        );
    }
    if (job.motivoParada) {
        return (
            <Notice tone="warn" title="A cota de hoje acabou">
                Parou com segurança antes de o Google recusar. {job.proximoPasso} Ela continua de onde parou.
            </Notice>
        );
    }
    if (job.status === 'failed') {
        return (
            <Notice tone="error" title="Algo deu errado no meio do caminho">
                {job.erro ?? 'Erro desconhecido.'} O que já saiu está registrado no backup.
            </Notice>
        );
    }
    if (errors > 0 && job.status === 'partial') {
        return (
            <Notice tone="error" title={`${num(errors)} ${errors === 1 ? 'item não saiu' : 'itens não saíram'}`}>
                O YouTube recusou esses itens. Rode a remoção de novo para tentar outra vez.
            </Notice>
        );
    }
    return null;
}

function UndoPanel({ job, panelRef }: { job: RemovalJob; panelRef: RefObject<HTMLElement | null> }) {
    const [copied, setCopied] = useState<'idle' | 'copied' | 'select'>('idle');
    const commandRef = useRef<HTMLElement>(null);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(job.restaurar);
            setCopied('copied');
        } catch {
            const range = document.createRange();
            if (commandRef.current) range.selectNodeContents(commandRef.current);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
            setCopied('select');
        }
        window.setTimeout(() => setCopied('idle'), 2_000);
    };

    return (
        <aside className="panel" aria-label="Se precisar desfazer" ref={panelRef}>
            <h2>Se precisar desfazer</h2>
            <p className="safe">
                <Icon name="shield" />A playlist original está salva. A restauração devolve os vídeos às posições de
                antes, e pode rodar mais de uma vez sem duplicar nada.
            </p>
            <code className="command" ref={commandRef}>
                {job.restaurar}
            </code>
            <button type="button" className="btn btn-ghost" onClick={copy}>
                <Icon name={copied === 'copied' ? 'check' : 'copy'} />
                {copied === 'copied' ? 'Copiado' : copied === 'select' ? 'Selecionado, use Ctrl+C' : 'Copiar comando'}
            </button>
            {job.status !== 'running' && (
                <a className="btn btn-primary" href={href.playlists()}>
                    Voltar às playlists
                </a>
            )}
        </aside>
    );
}

function JobError({ error }: { error: ApiError }) {
    if (error.code === 'job_not_found') {
        return (
            <Notice tone="warn" title="Não encontrei essa remoção">
                O progresso fica na memória do servidor e some quando ele reinicia. O que saiu continua registrado no
                arquivo de backup, na pasta backups/.
            </Notice>
        );
    }
    return (
        <Notice tone="error" title="Não consegui acompanhar a remoção">
            {error.message}
        </Notice>
    );
}
