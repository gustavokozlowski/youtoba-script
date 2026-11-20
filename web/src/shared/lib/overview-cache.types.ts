import type { DuplicatesOverview } from '../api/api.types';

export interface CachedOverview {
    overview: DuplicatesOverview;
    savedAt: string;
    /** Uma remoção começou depois desta análise: os números mudaram, mas os títulos e capas continuam úteis. */
    stale?: boolean;
}
