import type { RefObject } from 'react';
import type { DuplicatesPreview } from '../../shared/api/api.types';
import type { ApiError } from '../../shared/api/client';

export interface ReviewScreenProps {
    playlistId: string;
}

export interface TrioProps {
    preview: DuplicatesPreview;
}

export interface DuplicateListProps {
    preview: DuplicatesPreview;
    onGoToConfirm: () => void;
}

export interface RemovePanelProps {
    preview: DuplicatesPreview;
    playlistId: string;
    onChanged: () => void;
    confirmRef: RefObject<HTMLInputElement | null>;
}

export interface LoadErrorProps {
    error: ApiError;
    onRetry: () => void;
}

export interface ReviewHeaderProps {
    playlistId: string;
    title: string;
    preview: DuplicatesPreview | undefined;
    loadError: ApiError | null;
    changed: boolean;
}
