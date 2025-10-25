require('dotenv').config();
const { CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL } = process.env;

import queryString from 'node:querystring';

import type { NextFunction, Request, Response } from 'express';
import { google } from 'googleapis';
import urlParse from 'url-parse';
import { saveToken } from '../utils/repository/user.repository';
import type { GetAuthorizationTokenResponse } from './types/auth.types';

const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube',
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL);

export const authUserGetUrl = (req: Request, res: Response, _next: NextFunction) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: JSON.stringify({
            callbackUrl: req.body.callbackUrl,
            userID: req.body.userid,
        }),
    });

    if (!url) {
        res.status(401).send('Ixiiii deu merda aqui ò!!!');
    }

    res.status(200).json({ url });
};

export const getAuthorizationToken = async (
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<GetAuthorizationTokenResponse> => {
    console.warn('#GET_AUTHORIZATION_TOKEN');
    const queryURL = new urlParse(req.url);
    const query = queryString.decode(queryURL.query);
    const code = query.code as string;
    const data = await oauth2Client.getToken(code);

    const bearerToken = data.tokens.access_token;

    if (typeof bearerToken === 'string') {
        // const token = jwt.sign({ bearerToken }, JWT_SECRET, { expiresIn: '12h' });
        const success = saveToken('bearerToken', bearerToken);
        // ADICIONAR JWT AO RESPONSE NO FUTURO
        const response: GetAuthorizationTokenResponse = { success, bearerToken };
        res.json(response);
        return response;
    }

    throw new Error('Falha para gerar Token!');
};
