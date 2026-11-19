import { type Request, type Response, Router } from 'express';
import { EXPECTED, seedTestPlaylist } from '../dev/test-playlist.seed';
import { googleAuth } from '../services/google';
import { YoutubeClient } from '../services/youtube/client/youtube.client';

const devRouter = Router();

devRouter.post('/seed-test-playlist', async (_req: Request, res: Response) => {
    const token = await googleAuth().getAccessToken();
    const apiKey = process.env.API_KEY;

    if (!token || !apiKey) {
        res.status(401).json({ error: 'not_connected', login: '/auth/login' });
        return;
    }

    try {
        const result = await seedTestPlaylist(new YoutubeClient({ apiKey, token }));
        const status = result.status === 'exists' ? 409 : result.failed.length > 0 ? 207 : 201;
        res.status(status).json({
            ...result,
            url: `https://www.youtube.com/playlist?list=${result.playlistId}`,
            expected: EXPECTED,
        });
    } catch (error: any) {
        console.error('Erro ao criar a playlist de teste:', error?.response?.status, error?.message);
        res.status(502).json({ error: 'seed_failed', detail: error?.response?.data?.error?.message });
    }
});

export { devRouter };
