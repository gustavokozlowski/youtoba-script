require('dotenv').config();

import axios from 'axios';
import type { Response } from 'express';
import { getToken } from '../utils/repository/user.repository';

const { API_KEY } = process.env;

export class YoutubeService { 
token: string | undefined;

constructor(){
this._getCredentials()
}

    private async _getCredentials() {
        const { token } = await getToken('bearerToken');

        if (!token || typeof token === 'undefined') {
            console.info('DEU MERDA AQUI NA PORRA DO TOKEN DO YOUTOBA HEIN PQP!');
            return undefined;
        }
        this.token = token;
        return null;
    }

    async getAllPlaylists(_req: Request, res: Response) {
        // const decode = jwt.verify(token, JWT_SECRET);
        try {
            // const decoded = jwt.verify(bearerToken, JWT_SECRET);
            console.warn('=============================== #GET_ALL_PLAYLISTS ==================================');
            // console.log("decode: ", decoded)
        
            const result = await axios.get(
                `https://youtube.googleapis.com/youtube/v3/playlists?part=contentDetails&mine=true&key=${API_KEY}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                },
            );

            return res.status(200).json({
                mensagem: 'DEU BOM CARAAALHO!',
                resultado: result.data,
            });
        } catch (e: any) {
            console.error('Error daqueles', e.response);

            return res.status(400).json({ messagem: 'deu merda no get heein' });
        }
    }

    async removeDuplicatedItems(itemsToRemove: string[]) {
        const requests = itemsToRemove.map(async (itemId: string) => {
            await axios.delete(`https://youtube.googleapis.com/youtube/v3/playlistItems?id=${itemId}&key=${API_KEY}`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: 'application/json',
                },
            });
        });

        const result = await Promise.all(requests).catch((e: any) => console.error('Fudeo pra excluir os videos!\n', e));
        return result;
    }
}
