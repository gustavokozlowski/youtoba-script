/** O formato que um erro do cliente HTTP do Google pode ter. Tudo opcional: nada é garantido. */
export interface HttpErrorLike<Body> {
    message?: unknown;
    response?: { status?: number; data?: Body };
}

/** Corpo de erro da API do Google: { error: { message, errors: [{ reason }] } }. */
export interface GoogleApiErrorBody {
    error?: { message?: string; errors?: { reason?: string }[] };
}
