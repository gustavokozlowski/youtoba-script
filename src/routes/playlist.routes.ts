import { Router } from 'express';
import { getAllPlaylists, getPlaylistInfoById, removeDuplicatedItems } from '../controllers/playlist.controller';

const playlistRouter = Router();

playlistRouter.route('/get-all').get(getAllPlaylists);
playlistRouter.route('/:playlistId').get(getPlaylistInfoById);
playlistRouter.route('/:playlistId/remove-duplicates').delete(removeDuplicatedItems);

export { playlistRouter };
