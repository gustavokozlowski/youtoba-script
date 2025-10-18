require('dotenv').config();

import axios from 'axios';

const { API_KEY } = process.env;
// import { getToken } from "../utils/repository/user.repository";

export class YoutubeService {
   constructor(public token: string) {}

   //  private async getCredentials(){
   // const bearerToken =  getToken("bearerToken");

   // if (!bearerToken.token || typeof bearerToken.token === undefined) {
   //   console.info("DEU MERDA AQUI NA PORRA DO TOKEN DO YOUTOBA HEIN PQP!");
   //   throw new Error('Token is invalid or undefined');
   // }

   //  }

   async removeDuplicatedItems(itemsToRemove: any) {
     
     const success = itemsToRemove.map(async (itemId: any) => {
         await axios.delete(`https://youtube.googleapis.com/youtube/v3/playlistItems?id=${itemId}&key=${API_KEY}`, {
            headers: {
               Authorization: `Bearer ${this.token}`,
               Accept: 'application/json',
            },
         });
      });
     
     const result = await Promise.all(success).catch((e: any) => console.error('Fudeo pra excluir os videos!\n', e));
     return result
   }
}
