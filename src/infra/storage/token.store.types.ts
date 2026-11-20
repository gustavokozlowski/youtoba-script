export interface TokenStore {
    save(account: string, refreshToken: string): void;
    get(account: string): string | undefined;
    delete(account: string): void;
}

export interface ClosableTokenStore extends TokenStore {
    close(): void;
}

/** Linha da tabela credentials (só o que o SELECT lê). */
export interface CredentialRow {
    refresh_token_enc: string;
}
