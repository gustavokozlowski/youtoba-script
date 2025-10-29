import type { Request, Response } from 'express';

require('dotenv').config();

import axios from 'axios';

const { API_KEY } = process.env;

import { YoutubeService } from '../services/youtube/youtube-playlist.services';
import { getToken } from '../utils/repository/user.repository';

const youtubeService = new YoutubeService();

export const getAllPlaylists = async (_req: Request, res: Response) => {
    try {
        const result = await youtubeService.getPlaylists();

        return res.status(200).json({
            mensagem: 'DEU BOM CARAAALHO!',
            resultado: result,
        });
    } catch (e: any) {
        console.error('Error daqueles', e.response);

        return res.status(400).json({ messagem: 'deu merda no get heein' });
    }
};

export const getPlaylistInfoById = async (playlistId: any) => {
    const bearerToken = await getToken('bearerToken');

    if (!bearerToken) {
        throw new Error('Token inválido! Por favor, faça o login novamente!');
    }

    try {
        const playlistInfo = await axios.get<any>(
            `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${API_KEY}`,
            {
                headers: {
                    Authorization: `Bearer ${bearerToken.token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            },
        );

        const { totalResults } = playlistInfo.data.pageInfo;

        return {
            mensagem: 'OLHA ESSA PLAYLIST:\n',
            totalPages: totalResults,
        };
    } catch (e) {
        console.error('Error daqueles:', e);
        throw new Error('deu merda no get heein');
    }
};

export const getPlaylistItems = async (req: Request, res: Response) => {
    let initialPlaylist = [];
    const bearerToken = await getToken('bearerToken');
    const { playlistId } = req.params;

    if (!bearerToken) {
        return res.send('Token inválido! Por favor, faça o login novamente!');
    }

    try {
        // const decoded = jwt.verify(token, JWT_SECRET);

        const result = await axios.get<any>(
            `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${API_KEY}`,
            {
                headers: {
                    Authorization: `Bearer ${bearerToken.token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            },
        );

        const { data } = result;

        const firstList = data.items.map((item: any) => item);

        initialPlaylist = [...firstList];

        console.info('Mais informações dessa Playlist', result.data);

        let nextPageToken = result.data.nextPageToken;

        if (nextPageToken) {
            do {
                const playlist = await axios.get<any>(
                    `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&pageToken=${nextPageToken}&playlistId=${playlistId}&key=${API_KEY}`,
                    {
                        headers: {
                            Authorization: `Bearer ${bearerToken.token}`,
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                    },
                );

                const playlistData = playlist.data;

                nextPageToken = playlistData.nextPageToken;

                playlistData.items.map((item: any) => initialPlaylist.push(item));

                if (!playlistData.nextPageToken) nextPageToken = undefined;
            } while (nextPageToken !== undefined);
        }

        const filteredPlaylist = removeItemsDuplicated(initialPlaylist);

        console.info(
            'OLHA A DESCREPÂNCIA:\n',
            'Items na playlist nova:',
            filteredPlaylist.length,
            '\n',
            'Items na playlist original:',
            initialPlaylist.length,
        );

        return res.status(200).json({
            mensagem: 'DEU BOM CARAAALHO!',
            resultado: filteredPlaylist,
        });
    } catch (e) {
        console.error('Error daqueles', e);

        return res.status(400).json({ messagem: 'deu merda no get heein' });
    }
};

// REFATORAR EM BREVE!
export const removeItemsDuplicated = (list: any[]) => {
    const newList = [] as any[];

    list.forEach((item) => {
        const videoId = item.contentDetails.videoId;
        if (!newList.some((i) => i.contentDetails.videoId === videoId)) {
            newList.push(item);
        }
    });

    // // chamar classe do serviço para remover os duplicados da playlist no youtube
    // const youtubeService = new YoutubeService();
    // await youtubeService.removeDuplicatedItems(newList.map(item => item.id));

    return newList;
};
