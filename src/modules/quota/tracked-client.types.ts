import type { YoutubeClient } from '../../infra/youtube/youtube.client';

export type ClientFactory = () => Promise<YoutubeClient | undefined>;
