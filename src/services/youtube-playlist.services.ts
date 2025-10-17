require("dotenv").config();
const axios = require("axios");
const { API_KEY } = process.env;
const { getToken } = require("../utils/repository/user.repository");

export class YoutubeService {
token: string = ''
  
  constructor() {
    const { bearerToken } = getToken("bearerToken");

    if (!bearerToken.token || typeof bearerToken.token === undefined) {
      console.info("DEU MERDA AQUI NA PORRA DO TOKEN DO YOUTOBA HEIN PQP!");
      return new Error('');
    }

    this.token = bearerToken.token as string;
  }

  async removeItemsDuplicated(itemsToRemove: any) {
    itemsToRemove.map(async (itemId: any) => {
      await axios({
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
        Accept: "application/json",
        url: `https://youtube.googleapis.com/youtube/v3/playlistItems?id=${itemId}&key=${API_KEY}`,
      });
    });
  }
}
