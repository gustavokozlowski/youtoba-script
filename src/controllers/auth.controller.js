require('dotenv').config()
const { CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL, JWT_SECRET } = process.env
const { google } = require('googleapis')
const request = require('request')
const urlParse = require('url-parse')
const queryParse = require('query-string')
const jwt = require('jsonwebtoken');
const NodeCache = require("node-cache");

const tokenCache = new NodeCache();

const scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube']

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET_KEY,
    REDIRECT_URL
)

const authUserGetUrl = async (req, res) => {

    const url = await oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: JSON.stringify({
            callbackUrl: req.body.callbackUrl,
            userID: req.body.userid
        })
    })

    request(url, (err, response, body) => {
        // console.error("ERROR: ", err)
        // // biome-ignore lint/complexity/useOptionalChain: <explanation>
        // console.info("STATUSCODE: ", response && response.statusCode)
        res.status(200).json({ url })
    })
}

const getAuthorizationToken = async (req, res, next) => {
    const queryURL = new urlParse(req.url);
    const { query } = queryParse.default.parseUrl(queryURL.query);
    const code = query.code

    console.warn("Codiguin:", code)

    const data = await oauth2Client.getToken(code)

    const bearerToken = data.tokens.access_token

    if (bearerToken) {
        const token = jwt.sign({ bearerToken }, JWT_SECRET, { expiresIn: '12h' });

        tokenCache.set("bearerToken", bearerToken)
        // res.redirect('/')
        return res.json({
            message: "Token gerado com sucesso",
            bearerToken: bearerToken,
            jwtToken: token
        });
    }
    return res.status(401).send(
        'Credenciais inválidas!'
    );
}

module.exports = {
    getAuthorizationToken,
    oauth2Client,
    authUserGetUrl
};