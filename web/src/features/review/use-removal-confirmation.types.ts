import type { UseMutationResult } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import type { RemovalStarted } from '../../shared/api/api.types';
import type { ApiError } from '../../shared/api/client';

/** A mutação que começa uma remoção: recebe o número confirmado. */
export type StartRemovalMutation = UseMutationResult<RemovalStarted, ApiError, number>;

export interface RemovalConfirmation {
    n: number;
    inputId: string;
    hintId: string;
    typed: string;
    setTyped: (value: string) => void;
    confirmed: boolean;
    sending: boolean;
    error: ApiError | undefined;
    submit: (event: FormEvent) => void;
}
