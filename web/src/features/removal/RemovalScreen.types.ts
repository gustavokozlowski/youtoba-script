import type { RefObject } from 'react';
import type { RemovalJob } from '../../shared/api/api.types';
import type { ApiError } from '../../shared/api/client';

export interface RemovalScreenProps {
    jobId: string;
}

export interface JobViewProps {
    job: RemovalJob;
    fresh: Set<string>;
}

export interface StopNoticeProps {
    job: RemovalJob;
    errors: number;
}

export interface UndoPanelProps {
    job: RemovalJob;
    panelRef: RefObject<HTMLElement | null>;
}

export interface JobErrorProps {
    error: ApiError;
}

export interface RemovalWindow {
    running: boolean;
    errors: number;
    current: RemovalJob['itens'][number] | undefined;
    rows: RemovalJob['itens'];
}
