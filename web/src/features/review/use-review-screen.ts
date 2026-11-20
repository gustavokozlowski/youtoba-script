import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { keys, usePreview } from '../../shared/api/queries';
import { findPlaylist, playlistTitle } from '../../shared/lib/overview-cache';

export function useReviewScreen(playlistId: string) {
    const known = findPlaylist(playlistId);
    const title = playlistTitle(playlistId);
    const client = useQueryClient();
    const { data: preview, error: loadError, refetch } = usePreview(playlistId);
    const [changed, setChanged] = useState(false);
    const confirmRef = useRef<HTMLInputElement>(null);

    const goToConfirm = () => {
        confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        confirmRef.current?.focus({ preventScroll: true });
    };

    const reloadAfterChange = () => {
        setChanged(true);
        void client.resetQueries({ queryKey: keys.preview(playlistId) });
    };

    return { known, title, preview, loadError, changed, confirmRef, goToConfirm, reloadAfterChange, refetch };
}
