const axios = require('axios')
const google = require('googleapis')


// const baseUrl = 'https://youtube.googleapis.com/youtube/v3/'
const apiKey = 'AIzaSyD3sSQgqJAyTcSFwyliTd2HuwP4SGk7rdo'
const youtube = new google.youtube_v3.Youtube({
    version: 'v3',
    auth: apiKey
})

const oauth2Client = new google.Auth.OAuth2Client(
    '713874834625-6kpes0338ltg2g4fsp33l2b9k553i7sk.apps.googleusercontent.com',
    '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',
    'http://localhost:8000/'
);


const getAllPlaylists = async (req, res) => {
    try {
        const response = youtube.playlists.list({       
            part: 'snippet',
            mine: true,
            access_token: "4/0AanRRrsaXOtg2Kk0bounFUhKkfMtj_lHQczH5djq0mmSI9JVEDCrkQaMYF4vr5_Cm3nSSw",

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