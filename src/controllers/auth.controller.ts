import type { NextFunction, Request, Response } from 'express';
import { googleAuth, LOGIN_TTL_MS, MissingRefreshTokenError, pendingLogins } from '../services/google';

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

const retryLink = '<p><a href="/auth/login">Tentar de novo</a> · <a href="/">Voltar ao youtoba</a></p>';

const loginFailed = (res: Response, status: number, body: string) =>
    res.status(status).send(renderPage('Login não concluído', `${body}\n${retryLink}`));

// O state do login fica num cookie deste navegador. Lax: volta na navegação vinda do Google.
// Sem `secure` porque o servidor roda em http://localhost.
const STATE_COOKIE = 'youtoba_oauth_state';
const stateCookie = { httpOnly: true, sameSite: 'lax', path: '/auth' } as const;

export const authUserGetUrl = (_req: Request, res: Response) => {
    const login = pendingLogins().start();
    res.cookie(STATE_COOKIE, login.state, { ...stateCookie, maxAge: LOGIN_TTL_MS });
    res.redirect(googleAuth().authUrl(login));
};

/** O verifier do PKCE, só quando a volta do Google traz o state que este navegador recebeu. */
function verifierFor(req: Request): string | undefined {
    const { state } = req.query;
    if (typeof state !== 'string' || state !== req.cookies?.[STATE_COOKIE]) return undefined;
    return pendingLogins().consume(state);
}

export const getAuthorizationToken = async (req: Request, res: Response, next: NextFunction) => {
    const { code, error } = req.query;
    res.clearCookie(STATE_COOKIE, stateCookie);

    if (typeof error === 'string') {
        loginFailed(
            res,
            400,
            `<p>O Google respondeu: <code>${escapeHtml(error)}</code>.</p>
<p>Se foi <code>access_denied</code>, confira se a conta está em <em>Usuários de teste</em> no Google Cloud.</p>`,
        );
        return;
    }
    if (typeof code !== 'string' || code.length === 0) {
        loginFailed(res, 400, '<p>O Google não enviou o código de autorização.</p>');
        return;
    }
    const codeVerifier = verifierFor(req);
    if (!codeVerifier) {
        loginFailed(res, 400, '<p>Este login não começou neste navegador ou levou mais de 10 minutos.</p>');
        return;
    }

    try {
        await googleAuth().connect(code, codeVerifier);
        // Volta para a interface. WEB_URL só é preciso quando ela roda no Vite (outra porta).
        res.redirect(process.env.WEB_URL ?? '/');
    } catch (err) {
        if (err instanceof MissingRefreshTokenError) {
            loginFailed(res, 502, '<p>O Google não enviou o token de acesso contínuo.</p>');
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
