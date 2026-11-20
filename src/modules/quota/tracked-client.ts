import { setting } from '../../config/settings';
import { YoutubeClient } from '../../infra/youtube/youtube.client';
import type { YoutubeClientConfig, YoutubeClientOptions } from '../../infra/youtube/youtube-api.types';
import { googleAuth } from '../auth/google-auth.service';
import { type QuotaTracker, quotaTracker } from './quota-tracker.service';

/** Client que registra o custo de cada chamada na quota do dia. Use este em vez de `new YoutubeClient`. */
export function createTrackedClient(
    config: YoutubeClientConfig,
    tracker: QuotaTracker = quotaTracker(),
    options: Omit<YoutubeClientOptions, 'onCost' | 'onQuotaExceeded'> = {},
): YoutubeClient {
    return new YoutubeClient(config, {
        ...options,
        onCost: (units) => tracker.spend(units),
        onQuotaExceeded: () => tracker.markExhausted(),
    });
}

/** Client da conta conectada, um por chamada (nada de token guardado); undefined sem login. */
export async function connectedClient(): Promise<YoutubeClient | undefined> {
    const token = await googleAuth().getAccessToken();
    return token ? createTrackedClient({ apiKey: setting('API_KEY'), token }) : undefined;
}
