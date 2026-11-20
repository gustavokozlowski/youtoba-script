import type { DuplicatesOverview, PlaylistSummary } from '../../shared/api/api.types';
import type { ApiError } from '../../shared/api/client';

export interface SummaryProps {
    overview: DuplicatesOverview;
}

export interface PlaylistListProps {
    overview: DuplicatesOverview;
}

export interface PlaylistRowProps {
    playlist: PlaylistSummary;
    dailyLimit: number;
}

export interface FitLabelProps {
    custoRemocao: PlaylistSummary['custoRemocao'];
}

export interface PlaylistHeaderProps {
    overview: DuplicatesOverview | undefined;
    loading: boolean;
    dataUpdatedAt: number;
    onAnalyze: () => void;
}

export interface PlaylistNoticesProps {
    overview: DuplicatesOverview | undefined;
    error: ApiError | null;
    onRetry: () => void;
}
