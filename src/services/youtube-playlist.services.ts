require('dotenv').config();
import axios from 'axios';
import { Response } from 'express';
import { getToken } from '../utils/repository/user.repository';

const { API_KEY } = process.env;

export class YoutubeService {
    bearerToken: string | undefined;
    constructor() {

        this.bearerToken = undefined;
}

    private async _getCredentials(){
    const { token } = await getToken("bearerToken");

    if (!token || typeof token === undefined) {
      console.info("DEU MERDA AQUI NA PORRA DO TOKEN DO YOUTOBA HEIN PQP!");
      throw new Error('Token is invalid or undefined');
    }
     
     return token;
}

    async getAllPlaylists(_req: Request, res: Response) {
        // const decode = jwt.verify(token, JWT_SECRET);
        const bearerToken = await this._getCredentials();
        try {
            // const decoded = jwt.verify(bearerToken, JWT_SECRET);
            console.warn('=============================== #GET_ALL_PLAYLISTS ==================================');
            // console.log("decode: ", decoded)
            console.log('BEAR TOKEN: ', bearerToken);
            console.log('MSG TOKEN: ', bearerToken);
            const result = await axios.get(
                `https://youtube.googleapis.com/youtube/v3/playlists?part=contentDetails&mine=true&key=${API_KEY}`,
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
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

    async removeDuplicatedItems(itemsToRemove: any) {
        const success = itemsToRemove.map(async (itemId: any) => {
            await axios.delete(`https://youtube.googleapis.com/youtube/v3/playlistItems?id=${itemId}&key=${API_KEY}`, {
                headers: {
                    Authorization: `Bearer ${this.bearerToken}`,
                    Accept: 'application/json',
                },
            });
        });

        const result = await Promise.all(success).catch((e: any) => console.error('Fudeo pra excluir os videos!\n', e));
        return result;
    }
}
