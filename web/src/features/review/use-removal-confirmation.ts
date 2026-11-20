import { type FormEvent, useId, useState } from 'react';
import type { ApiError } from '../../shared/api/client';
import { href } from '../../shared/lib/route-links';
import type { RemovalConfirmation, StartRemovalMutation } from './use-removal-confirmation.types';

const handledHere = (error: ApiError) =>
    (error.code === 'already_running' && Boolean(error.body?.jobId)) || error.code === 'confirmation_required';

/**
 * A confirmação por digitação, igual para repetidos e apagados: `count` é o número que a pessoa
 * precisa digitar e `start` a mutação do tipo de remoção.
 */
export function useRemovalConfirmation(
    count: number,
    start: StartRemovalMutation,
    onChanged: () => void,
): RemovalConfirmation {
    const inputId = useId();
    const hintId = useId();
    const [typed, setTyped] = useState('');
    const confirmed = typed.trim() === String(count);
    const error = start.error && !handledHere(start.error) ? start.error : undefined;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!confirmed || start.isPending) return;
        start.mutate(count, {
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

    return { n: count, inputId, hintId, typed, setTyped, confirmed, sending: start.isPending, error, submit };
}
