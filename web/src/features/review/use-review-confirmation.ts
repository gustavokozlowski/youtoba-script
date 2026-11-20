import { type FormEvent, useId, useState } from 'react';
import type { DuplicatesPreview } from '../../shared/api/api.types';
import type { ApiError } from '../../shared/api/client';
import { useStartRemoval } from '../../shared/api/queries';
import { href } from '../../shared/lib/route-links';

const handledHere = (error: ApiError) =>
    (error.code === 'already_running' && Boolean(error.body?.jobId)) || error.code === 'confirmation_required';

export function useReviewConfirmation(preview: DuplicatesPreview, playlistId: string, onChanged: () => void) {
    const n = preview.duplicados;
    const inputId = useId();
    const hintId = useId();
    const [typed, setTyped] = useState('');
    const start = useStartRemoval(playlistId);
    const confirmed = typed.trim() === String(n);
    const error = start.error && !handledHere(start.error) ? start.error : undefined;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!confirmed || start.isPending) return;
        start.mutate(n, {
            onSuccess: (started) => {
                window.location.hash = href.removal(started.jobId);
            },
            onError: (mutationError) => {
                if (mutationError.code === 'already_running' && mutationError.body?.jobId) {
                    window.location.hash = href.removal(mutationError.body.jobId);
                } else if (mutationError.code === 'confirmation_required') {
                    onChanged();
                }
            },
        });
    };

    return { n, inputId, hintId, typed, setTyped, confirmed, sending: start.isPending, error, submit };
}
