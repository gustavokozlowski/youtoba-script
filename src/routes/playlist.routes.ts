import { Router } from 'express';
import {
    getAllPlaylists,
    getPlaylistInfoById,
    listPlaylistItems,
    previewDuplicates,
    removeDuplicatedItems,
} from '../controllers/playlist.controller';

const playlistRouter = Router();

playlistRouter.get('/get-all', getAllPlaylists);
playlistRouter.get('/:playlistId', getPlaylistInfoById);
playlistRouter.get('/:playlistId/items', listPlaylistItems);
playlistRouter.get('/:playlistId/duplicates', previewDuplicates);
playlistRouter.delete('/:playlistId/remove-duplicates', removeDuplicatedItems);

export { playlistRouter };
