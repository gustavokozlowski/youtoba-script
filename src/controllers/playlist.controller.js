const axios = require('axios')
const google = require('googleapis')

const youtube = new google.youtube_v3.Youtube({
    version: 'v3',
    auth: apiKey
})

const oauth2Client = new google.Auth.OAuth2Client(

);


const getAllPlaylists = async (req, res) => {
    try {
        const response = youtube.playlists.list({       
            part: 'snippet',
            mine: true,
            access_token: "",

        }, (err, resultado) => {
            if (err) {
                console.log("Error:", err)
            }
            if (resultado) {
                console.info("Resultado", resultado.data)
            }
        })
        // await axios.get(`${baseUrl}playlists?part=snippet&mine=true&key=${apiKey}`)
        res.json({ message: response.data });
    } catch (e) {
        console.error("Error:", e.response)
        return null
    }
};


module.exports = {
    getAllPlaylists
};