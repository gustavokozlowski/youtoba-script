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


//

// data: {
//     kind: 'youtube#playlistListResponse',
//     etag: 'x-XbXUX5baLGlxeouPfm5cDFheA',
//     nextPageToken: 'CAUQAA',
//     pageInfo: { totalResults: 100, resultsPerPage: 5 },
//     items: [ [Object], [Object], [Object], [Object], [Object] ]
//   }

// Tokens: {
//     tokens: {
//       access_token: 'ya29.a0ARW5m75n-sgPSTZcpVglTM6CrP0eB2wKDE68L_jrwzlfnjhwwN8ofQnAPLW6e9DHI3fVsVppZPN04Esbd-y2bskLqlSrSXkIrPyIqekK_N2GnmtLAj6U-BTpkk-nIfXKZBiON1RKZU-kc47doJFfcuNN9Wojzz1-BQaCgYKAbsSARISFQHGX2MiQOMzUESy04t8tKv2lPSaMg0169',
//       scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl',
//       token_type: 'Bearer',
//       expiry_date: 1736636038006
//     },
//     res: {
//       config: {
//         retry: true,
//         retryConfig: [Object],
//         method: 'POST',
//         url: 'https://oauth2.googleapis.com/token',
//         data: 'client_id=713874834625-6kpes0338ltg2g4fsp33l2b9k553i7sk.apps.googleusercontent.com&code_verifier=&code=4%2F0AanRRruuxS472wQQE2yvnp5FRVBCULzwECBXOkITggySyNL9X_4Rza_oePl590WN4GnkzQ&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauth&client_secret=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',
//         headers: [Object],
//         paramsSerializer: [Function: paramsSerializer],
//         body: 'client_id=713874834625-6kpes0338ltg2g4fsp33l2b9k553i7sk.apps.googleusercontent.com&code_verifier=&code=4%2F0AanRRruuxS472wQQE2yvnp5FRVBCULzwECBXOkITggySyNL9X_4Rza_oePl590WN4GnkzQ&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fauth&client_secret=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',
//         validateStatus: [Function: validateStatus],
//         responseType: 'unknown',
//         errorRedactor: [Function: defaultErrorRedactor]
//       },
//       data: {
//         access_token: 'ya29.a0ARW5m75n-sgPSTZcpVglTM6CrP0eB2wKDE68L_jrwzlfnjhwwN8ofQnAPLW6e9DHI3fVsVppZPN04Esbd-y2bskLqlSrSXkIrPyIqekK_N2GnmtLAj6U-BTpkk-nIfXKZBiON1RKZU-kc47doJFfcuNN9Wojzz1-BQaCgYKAbsSARISFQHGX2MiQOMzUESy04t8tKv2lPSaMg0169',
//         scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl',
//         token_type: 'Bearer',
//         expiry_date: 1736636038006
//       },
//       headers: {
//         'alt-svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
//         'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
//         'content-encoding': 'gzip',
//         'content-type': 'application/json; charset=utf-8',
//         date: 'Sat, 11 Jan 2025 21:54:02 GMT',
//         expires: 'Mon, 01 Jan 1990 00:00:00 GMT',
//         pragma: 'no-cache',
//         server: 'scaffolding on HTTPServer2',
//         'transfer-encoding': 'chunked',
//         vary: 'Origin, X-Origin, Referer',
//         'x-content-type-options': 'nosniff',
//         'x-frame-options': 'SAMEORIGIN',
//         'x-xss-protection': '0'
//       },
//       status: 200,
//       statusText: 'OK',
//       request: { responseURL: 'https://oauth2.googleapis.com/token' }
//     }
//   }