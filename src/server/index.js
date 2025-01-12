require('dotenv').config()
const express = require("express")
const { router } = require('../routes/playlist.js')
const { google } = require('googleapis')
const request = require('request')
const cors = require('cors')
const urlParse = require('url-parse')
const queryParse = require('query-string')
const axios = require('axios')

const { PORT, CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL, API_KEY } = process.env
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
// app.use(bodyParser.urlencoded({ extended: true }))
// app.use(bodyParser.json())
app.use(router)

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET_KEY,
    REDIRECT_URL
)

app.get('/getUrl', async (req, res) => {

    const scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube']

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: JSON.stringify({
            callbackUrl: req.body.callbackUrl,
            userID: req.body.userid
        })
    })

    request(url, (err, response, body) => {
        console.error("ERROR: ", err)
        // biome-ignore lint/complexity/useOptionalChain: <explanation>
        console.info("STATUSCODE: ", response && response.statusCode)

        res.status(200).json({ url })

    })
})

app.get('/auth', async (req, res) => {
    const queryURL = new urlParse(req.url);
    const { query } = queryParse.default.parseUrl(queryURL.query);
    const code = query.code

    console.warn("Codiguin:", code)

    const tokens = await oauth2Client.getToken(code)

    const bearerToken = tokens.tokens.access_token

    console.warn("Tokens:", tokens)

    res.send("MAROLOUUUUU!")

    // biome-ignore lint/style/useConst: <explanation>
    let stepArray = []

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

        console.error("Error daqueles:", e)

    }
})

app.listen(PORT, () => {
    console.log(`Servidor rodando liso na porta ${PORT}`)
})
