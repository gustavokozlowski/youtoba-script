require('dotenv').config();
const { CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL } = process.env;

import type { NextFunction, Request, Response } from 'express';
import { google } from 'googleapis';
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
        res.status(500).json({ error: 'auth_url_failed' });
        return;
    }

    res.status(200).json({ url });
};

export const getAuthorizationToken = async (req: Request, res: Response, next: NextFunction) => {
    const { code, error } = req.query;

    if (typeof error === 'string') {
        res.status(400).json({ error: 'oauth_denied', detail: error });
        return;
    }

    if (typeof code !== 'string' || code.length === 0) {
        res.status(400).json({ error: 'missing_code' });
        return;
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        const bearerToken = tokens.access_token;

        if (typeof bearerToken !== 'string') {
            res.status(502).json({ error: 'token_missing_in_response' });
            return;
        }

        const success = saveToken('bearerToken', bearerToken);
        const response: GetAuthorizationTokenResponse = { success, bearerToken };
        res.json(response);
    } catch (err) {
        next(err);
    }
};
