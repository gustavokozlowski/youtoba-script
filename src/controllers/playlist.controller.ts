import type { Request, Response } from 'express';

import { YoutubeService } from '../services/youtube/youtube-playlist.services';

const youtubeService = new YoutubeService();

export const getAllPlaylists = async (_req: Request, res: Response) => {
    try {
        const result = await youtubeService.playlists();

        if (!result) {
            return res.status(401).json({ mensagem: 'Não foi possível obter as playlists.' });
        }

        return res.status(200).json({
            mensagem: 'DEU BOM CARAAALHO!',
            resultado: result,
        });
    } catch (e: any) {
        console.error('Error ao obter playlists:', e);
        return res.status(400).json({ mensagem: 'Deu merda no get das playlists!' });
    }
};

export const getPlaylistInfoById = async (req: Request, res: Response) => {
    try {
        const { playlistId } = req.params;
        const result = await youtubeService.playlistDetailsById(playlistId);

        if (!result) {
            return res.status(404).json({ mensagem: 'Playlist não encontrada.' });
        }

        return res.status(200).json(result);
    } catch (e: any) {
        console.error('Error ao obter detalhes da playlist:', e);
        return res.status(400).json({ mensagem: 'Deu merda ao buscar detalhes da playlist!' });
    }
};

export const removeDuplicatedItems = async (req: Request, res: Response) => {
    try {
        const { playlistId } = req.params;
        const result = await youtubeService.removeDuplicateVideos(playlistId);

        if (!result) {
            return res.status(400).json({ mensagem: 'Não foi possível remover os duplicados.' });
        }

        return res.status(200).json({
            mensagem: 'Duplicados removidos com sucesso!',
            resultado: result,
        });
    } catch (e: any) {
        console.error('Error ao remover duplicados:', e);
        return res.status(400).json({ mensagem: 'Deu merda ao remover duplicados!' });
    }
};
