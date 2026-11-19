export interface TokenStore {
    save(account: string, refreshToken: string): void;
    get(account: string): string | undefined;
    delete(account: string): void;
}

export interface ClosableTokenStore extends TokenStore {
    close(): void;
}
