import { keys, usePreview } from '../../shared/api/queries';
import { useReviewShell } from './use-review-shell';

export function useReviewScreen(playlistId: string) {
    const shell = useReviewShell(playlistId, keys.preview(playlistId));
    const { data: preview, error: loadError, refetch } = usePreview(playlistId);
    return { ...shell, preview, loadError, refetch };
}
