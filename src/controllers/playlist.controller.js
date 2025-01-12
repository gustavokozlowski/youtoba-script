const axios = require('axios')

const getAllPlaylists = async () => {
    try {
        const result = await axios({
            method: 'GET',
            headers: {
                authorization: `Bearer ${bearerToken}`
            },
            "Accept": "application/json",
            url: `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet%2CcontentDetails&mine=true&key=${API_KEY}`

        })
        console.info(result)
    } catch (e) {
        console.error("Error daqueles", e.response)

        return null
    }
}


module.exports = {
    getAllPlaylists
};