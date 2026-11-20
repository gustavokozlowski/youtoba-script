export interface PendingLoginsOptions {
    /** Quanto tempo a pessoa tem para voltar do Google. */
    ttlMs: number;
    now: () => number;
}

/** O que vai para o Google: o state e o challenge. O verifier fica no servidor. */
export interface PendingLogin {
    state: string;
    codeChallenge: string;
}

export interface PendingLogins {
    start(): PendingLogin;
    /** Devolve o code_verifier do login e o apaga; undefined se o state não existe ou venceu. */
    consume(state: string): string | undefined;
    size(): number;
}
