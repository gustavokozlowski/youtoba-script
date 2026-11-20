import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { findPlaylist, playlistTitle } from '../../shared/lib/overview-cache';

/**
 * O que toda revisão tem em comum: título e contagens da análise guardada, o atalho para o campo
 * de confirmação e o "a playlist mudou" (relê a prévia de `previewKey` do zero).
 */
export function useReviewShell(playlistId: string, previewKey: QueryKey) {
    const client = useQueryClient();
    const known = findPlaylist(playlistId);
    const [changed, setChanged] = useState(false);
    const confirmRef = useRef<HTMLInputElement>(null);

    const goToConfirm = () => {
        confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        confirmRef.current?.focus({ preventScroll: true });
    };

    const reloadAfterChange = () => {
        setChanged(true);
        void client.resetQueries({ queryKey: previewKey });
    };

    return {
        title: playlistTitle(playlistId),
        deletedCount: known?.apagados ?? 0,
        changed,
        confirmRef,
        goToConfirm,
        reloadAfterChange,
    };
}
