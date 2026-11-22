/** Falha de uma tentativa; `ApiFailure` é compatível com este formato. */
export interface OneByOneAttemptFailure {
    status?: number;
    reason?: string;
}

export interface OneByOneFailure {
    id: string;
    status?: number;
    reason?: string;
}

export interface OneByOneProgressEvent {
    /** Índice do item na lista (0 = primeiro). */
    index: number;
    total: number;
    itemId: string;
    outcome: 'succeeded' | 'failed';
    status?: number;
    reason?: string;
}

export interface OneByOneOptions {
    /** Diz se ainda dá para gastar `units` hoje. Sem isso, segue até o Google recusar. */
    canSpend?: (units: number) => boolean;
    onProgress?: (event: OneByOneProgressEvent) => void;
}

export interface OneByOneResult {
    succeeded: string[];
    failed: OneByOneFailure[];
}

/** Tenta um item; devolve a falha, ou undefined se deu certo. */
export type OneByOneAttempt = (id: string) => Promise<OneByOneAttemptFailure | undefined>;
