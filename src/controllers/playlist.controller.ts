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

        switch (result.status) {
            case 'not_connected':
                return res.status(401).json({ erro: 'not_connected', login: '/auth/login' });
            case 'fetch_failed':
                return res
                    .status(502)
                    .json({ erro: 'playlist_fetch_failed', mensagem: 'Não foi possível ler a playlist.' });
            case 'no_duplicates':
                return res.status(200).json({ mensagem: 'Nenhum duplicado encontrado.', encontrados: 0, removidos: 0 });
        }

        const { found, removed, failed } = result;
        const body = { encontrados: found, removidos: removed.length, falhas: failed };

        if (failed.length === 0) {
            return res.status(200).json({ mensagem: 'Duplicados removidos.', ...body });
        }

        // 207: remoção parcial; 502: nada foi removido.
        return res.status(removed.length > 0 ? 207 : 502).json({
            mensagem: removed.length > 0 ? 'Remoção parcial: alguns itens falharam.' : 'Nenhum item foi removido.',
            ...body,
        });
    } catch (e: any) {
        console.error('Erro ao remover duplicados:', e?.response?.status, e?.message);
        return res.status(500).json({ erro: 'internal_error' });
    }
};
