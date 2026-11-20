export interface RemovalQuotaEstimate {
    listUnits: number;
    deleteUnits: number;
    total: number;
    dailyLimit: number;
    fitsInOneDay: boolean;
    maxDeletesPerDay: number;
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
