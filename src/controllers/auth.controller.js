require('dotenv').config()
const { CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL, JWT_SECRET } = process.env
const { google } = require('googleapis')
const axios = require('axios')
const urlParse = require('url-parse')
const queryString = require('node:querystring')
const jwt = require('jsonwebtoken');
const { getToken, saveToken } = require('../utils/repository/user.repository')

const scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube']

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET_KEY,
    REDIRECT_URL
)

const authUserGetUrl = async (req, res, next) => {

    const url = await oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: JSON.stringify({
            callbackUrl: req.body.callbackUrl,
            userID: req.body.userid
        })
    })

    if (!url) {
        res.status(401).send('Ixiiii deu merda aqui ò!!!');
    }

    res.status(200).json({ url })
}

const getAuthorizationToken = async (req, res, next) => {
    console.warn('=============================== #GET_AUTHORIZATION_TOKEN ==================================')
    const queryURL = new urlParse(req.url);
    const query = queryString.decode(queryURL.query);
    const code = query.code
    const data = await oauth2Client.getToken(code)

    console.info("CODE", code)
    console.info("DATA TOKEN \n", data.tokens.access_token)
    const bearerToken = data.tokens.access_token

    if (bearerToken) {
        // const token = jwt.sign({ bearerToken }, JWT_SECRET, { expiresIn: '12h' });
        const success = saveToken("bearerToken", bearerToken);
        console.warn("Salvou? \n", success)

        return res.json({
            message: "Token gerado com sucesso",
            bearerToken: bearerToken,
            // jwtToken: token
        });
    }

    return res.status(401).send('Credenciais inválidas!');
}

module.exports = {
    getAuthorizationToken,
    oauth2Client,
    authUserGetUrl
}