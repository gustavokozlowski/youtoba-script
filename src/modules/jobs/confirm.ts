/** O `confirm` da query: só inteiros não negativos valem; qualquer outra coisa é "ausente". */
export const parseConfirm = (value: unknown): number | undefined =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined;
