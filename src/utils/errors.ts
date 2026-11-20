import type { HttpErrorLike } from './errors.types';

/** Lê um erro desconhecido como erro HTTP, sem confiar em nenhum campo (todos podem faltar). */
export const httpErrorLike = <Body>(error: unknown): HttpErrorLike<Body> =>
    typeof error === 'object' && error !== null ? (error as HttpErrorLike<Body>) : {};

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
