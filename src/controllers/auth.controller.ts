require('dotenv').config();
const { CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL } = process.env;

import type { NextFunction, Request, Response } from 'express';
import { google } from 'googleapis';
import { saveToken } from '../utils/repository/user.repository';

const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube',
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL);

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const renderPage = (title: string, body: string) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · youtoba</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; }
  a { color: #2563eb; }
  code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; }
</style>
</head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>`;

export const authUserGetUrl = (_req: Request, res: Response, _next: NextFunction) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });

    if (!url) {
        res.status(500).json({ error: 'auth_url_failed' });
        return;
    }

    res.redirect(url);
};

export const getAuthorizationToken = async (req: Request, res: Response, next: NextFunction) => {
    const { code, error } = req.query;

    if (typeof error === 'string') {
        res.status(400).send(
            renderPage(
                'Login não concluído',
                `<p>O Google respondeu: <code>${escapeHtml(error)}</code>.</p>
<p>Se foi <code>access_denied</code>, confira se a conta está em <em>Usuários de teste</em> no Google Cloud.</p>
<p><a href="/auth/login">Tentar de novo</a></p>`,
            ),
        );
        return;
    }

    if (typeof code !== 'string' || code.length === 0) {
        res.status(400).send(
            renderPage(
                'Login não concluído',
                '<p>O Google não enviou o código de autorização.</p><p><a href="/auth/login">Tentar de novo</a></p>',
            ),
        );
        return;
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        const bearerToken = tokens.access_token;

        if (typeof bearerToken !== 'string') {
            res.status(502).send(
                renderPage(
                    'Login não concluído',
                    '<p>O Google não devolveu um token de acesso.</p><p><a href="/auth/login">Tentar de novo</a></p>',
                ),
            );
            return;
        }

        saveToken('bearerToken', bearerToken);
        res.send(
            renderPage(
                'Conectado ao YouTube',
                `<p>Login feito. A sessão vale por cerca de 1 hora.</p>
<p><a href="/playlist/get-all">Ver minhas playlists</a></p>`,
            ),
        );
    } catch (err) {
        next(err);
    }
};
