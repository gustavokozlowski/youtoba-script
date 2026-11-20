import { keys, useUnavailablePreview } from '../../shared/api/queries';
import { useReviewShell } from './use-review-shell';

export function useDeletedReviewScreen(playlistId: string) {
    const shell = useReviewShell(playlistId, keys.unavailable(playlistId));
    const { data: preview, error: loadError, refetch } = useUnavailablePreview(playlistId);
    return { ...shell, preview, loadError, refetch };
}
