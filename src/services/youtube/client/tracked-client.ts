import { YoutubeClient } from '../../../infra/youtube/youtube.client';
import type { YoutubeClientConfig, YoutubeClientOptions } from '../../../infra/youtube/youtube-api.types';
import { type QuotaTracker, quotaTracker } from '../quota-tracker';

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
