import { Router } from 'express';
import { getAllPlaylists, getPlaylistItems } from '../controllers/playlist.controller';

const playlistRouter = Router();

playlistRouter.route('/get-all').get(getAllPlaylists);
playlistRouter.route('/:playlistId').get(getPlaylistItems);

export { playlistRouter };