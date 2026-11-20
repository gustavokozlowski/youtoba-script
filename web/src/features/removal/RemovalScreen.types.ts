import type { RefObject } from 'react';
import type { RemovalJob } from '../../shared/api/api.types';

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

export interface UndoPanelProps {
    job: RemovalJob;
    panelRef: RefObject<HTMLElement | null>;
    onRestore: () => void;
    restoring: boolean;
}

export interface RemovalWindow {
    running: boolean;
    errors: number;
    current: RemovalJob['itens'][number] | undefined;
    rows: RemovalJob['itens'];
}
