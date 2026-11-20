import { Router } from 'express';
import {
    getAllPlaylists,
    getPlaylistInfoById,
    getPlaylistsWithDuplicates,
    listPlaylistItems,
    previewDuplicates,
} from './playlist.controller';

const playlistRouter = Router();

playlistRouter.get('/get-all', getAllPlaylists);
// Antes de '/:playlistId', senão o Express trata 'with-duplicates' como um id.
playlistRouter.get('/with-duplicates', getPlaylistsWithDuplicates);
playlistRouter.get('/:playlistId', getPlaylistInfoById);
playlistRouter.get('/:playlistId/items', listPlaylistItems);
playlistRouter.get('/:playlistId/duplicates', previewDuplicates);

export { playlistRouter };
