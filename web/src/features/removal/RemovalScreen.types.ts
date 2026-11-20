import type { RefObject } from 'react';
import type { JobStatus, RemovalJob } from '../../shared/api/api.types';

export interface RemovalScreenProps {
    jobId: string;
}

export interface JobViewProps {
    job: RemovalJob;
    fresh: Set<string>;
    onRestore: () => void;
    restoring: boolean;
}

export interface StopNoticeProps {
    job: RemovalJob;
    errors: number;
}

/** O painel lateral da remoção: o que cada tipo oferece depois (restaurar ou só o aviso do backup). */
export interface AsidePanelProps {
    job: RemovalJob;
    panelRef: RefObject<HTMLElement | null>;
    onRestore: () => void;
    restoring: boolean;
}

export interface RemovalKindCopy {
    /** O que a remoção tirou, no plural. */
    label: string;
    headings: Record<JobStatus, string>;
    /** O botão que leva ao painel lateral. */
    shortcut: string;
    doneTitle: (removed: number) => string;
    doneNote: string;
}

export interface RemovalWindow {
    running: boolean;
    errors: number;
    current: RemovalJob['itens'][number] | undefined;
    rows: RemovalJob['itens'];
}
