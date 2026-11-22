export interface RemovalQuotaEstimate {
    listUnits: number;
    deleteUnits: number;
    total: number;
    dailyLimit: number;
    fitsInOneDay: boolean;
    maxDeletesPerDay: number;
    daysNeeded: number;
}

/** Entrada do cálculo comum: quantas itens cada playlist lida tem e quantas escritas (de `writeCost` cada) se quer fazer. */
export interface WriteEstimateParams {
    itemCounts: number[];
    writeCount: number;
    writeCost: number;
    dailyLimit: number;
}

/** Custo de ler playlists e fazer escritas em série, sem considerar o que já foi gasto hoje. */
export interface WriteQuotaEstimate {
    listUnits: number;
    writeUnits: number;
    total: number;
    dailyLimit: number;
    fitsInOneDay: boolean;
    maxWritesPerDay: number;
    daysNeeded: number;
}

export interface QuotaSnapshot {
    /** Dia da quota, YYYY-MM-DD no horário do Pacífico. */
    day: string;
    used: number;
    limit: number;
    remaining: number;
    /** Quando a quota zera (ISO, UTC). */
    resetsAt: string;
}
