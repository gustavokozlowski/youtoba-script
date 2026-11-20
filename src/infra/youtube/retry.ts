import { apiFailure } from './api-failure';
import type { RetryOptions } from './youtube-api.types';

const RETRYABLE_STATUS = new Set([409, 429, 500, 503]);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Repete em conflito e instabilidade, com espera exponencial (1 s, 2 s, 4 s por padrão). */
export async function withRetry<T>(request: () => Promise<T>, { retries, baseDelayMs }: RetryOptions): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await request();
        } catch (error) {
            const { status } = apiFailure(error);
            if (status === undefined || !RETRYABLE_STATUS.has(status) || attempt >= retries) throw error;
            await wait(baseDelayMs * 2 ** attempt);
        }
    }
}
