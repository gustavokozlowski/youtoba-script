import { type Request, type Response, Router } from 'express';
import { apiFailure } from '../../infra/youtube/api-failure';
import { logger } from '../../shared/logger';
import { connectedClient } from '../quota/tracked-client';
import {
    expectedFor,
    LARGE_TEST_PLAYLIST_TITLE,
    largeTestSequence,
    seedPlaylist,
    TEST_PLAYLIST_SEQUENCE,
    TEST_PLAYLIST_TITLE,
} from './test-playlist.seed';

const devRouter = Router();

// POST /dev/seed-test-playlist          → youtoba-teste (7 itens, ~400 unidades de quota)
// POST /dev/seed-test-playlist?size=large → youtoba-teste-grande (56 itens, ~2.900 unidades)
devRouter.post('/seed-test-playlist', async (req: Request, res: Response) => {
    const client = await connectedClient();
    if (!client) {
        res.status(401).json({ error: 'not_connected', login: '/auth/login' });
        return;
    }

    const large = req.query.size === 'large';

    try {
        const sequence = large ? await largeTestSequence(client) : TEST_PLAYLIST_SEQUENCE;
        const title = large ? LARGE_TEST_PLAYLIST_TITLE : TEST_PLAYLIST_TITLE;
        const result = await seedPlaylist(client, title, sequence);
        const status = result.status === 'exists' ? 409 : result.failed.length > 0 ? 207 : 201;
        res.status(status).json({
            title,
            ...result,
            url: `https://www.youtube.com/playlist?list=${result.playlistId}`,
            expected: expectedFor(sequence),
        });
    } catch (error) {
        const { status, reason, message } = apiFailure(error);
        logger.error({ status, reason, mensagem: message }, 'Erro ao criar a playlist de teste');
        res.status(502).json({ error: 'seed_failed', reason, detail: message });
    }
});

export { devRouter };
