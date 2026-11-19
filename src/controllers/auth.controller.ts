import type { NextFunction, Request, Response } from 'express';
import { googleAuth, MissingRefreshTokenError } from '../services/google';

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

const retryLink = '<p><a href="/auth/login">Tentar de novo</a></p>';

export const authUserGetUrl = (_req: Request, res: Response) => {
    res.redirect(googleAuth().authUrl());
};

export const getAuthorizationToken = async (req: Request, res: Response, next: NextFunction) => {
    const { code, error } = req.query;

    if (typeof error === 'string') {
        res.status(400).send(
            renderPage(
                'Login não concluído',
                `<p>O Google respondeu: <code>${escapeHtml(error)}</code>.</p>
<p>Se foi <code>access_denied</code>, confira se a conta está em <em>Usuários de teste</em> no Google Cloud.</p>
${retryLink}`,
            ),
        );
        return;
    }

    if (typeof code !== 'string' || code.length === 0) {
        res.status(400).send(
            renderPage('Login não concluído', `<p>O Google não enviou o código de autorização.</p>${retryLink}`),
        );
        return;
    }

    try {
        await googleAuth().connect(code);
        res.send(
            renderPage(
                'Conectado ao YouTube',
                `<p>Login salvo. Você não precisa logar de novo quando o servidor reiniciar.</p>
<p>Com o app em modo <em>Testing</em>, o Google pede um novo login a cada 7 dias.</p>
<p><a href="/playlist/get-all">Ver minhas playlists</a></p>`,
            ),
        );
    } catch (err) {
        if (err instanceof MissingRefreshTokenError) {
            res.status(502).send(
                renderPage('Login não concluído', `<p>O Google não enviou o token de acesso contínuo.</p>${retryLink}`),
            );
            return;
        }
        next(err);
    }
};

export const authStatus = (_req: Request, res: Response) => {
    res.json({ connected: googleAuth().isConnected() });
};

export const logout = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await googleAuth().disconnect();
        res.json({ connected: false });
    } catch (err) {
        next(err);
    }
};
