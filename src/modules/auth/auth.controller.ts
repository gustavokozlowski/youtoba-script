import type { Request, Response } from 'express';
import { setting } from '../../config/settings';
import { asyncHandler } from '../../shared/async-handler';
import type { LoginCallback } from './auth.types';
import { googleRefused, loginFailed } from './auth-pages';
import { MissingRefreshTokenError } from './google-auth.errors';
import { googleAuth } from './google-auth.service';
import { LOGIN_TTL_MS, pendingLogins } from './pending-logins';

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

/** O code e o verifier da volta do Google, ou o motivo (HTML) de não dar para concluir o login. */
function readCallback(req: Request): LoginCallback {
    const { code, error } = req.query;
    if (typeof error === 'string') return { problem: googleRefused(error) };
    if (typeof code !== 'string' || code.length === 0) {
        return { problem: '<p>O Google não enviou o código de autorização.</p>' };
    }
    const codeVerifier = verifierFor(req);
    if (!codeVerifier) return { problem: '<p>Este login não começou neste navegador ou levou mais de 10 minutos.</p>' };
    return { code, codeVerifier };
}

export const getAuthorizationToken = asyncHandler(async (req, res) => {
    res.clearCookie(STATE_COOKIE, stateCookie);
    const callback = readCallback(req);
    if ('problem' in callback) return loginFailed(res, 400, callback.problem);

    try {
        await googleAuth().connect(callback.code, callback.codeVerifier);
    } catch (error) {
        if (!(error instanceof MissingRefreshTokenError)) throw error;
        return loginFailed(res, 502, '<p>O Google não enviou o token de acesso contínuo.</p>');
    }
    // Volta para a interface. WEB_URL só é preciso quando ela roda no Vite (outra porta).
    return res.redirect(setting('WEB_URL') ?? '/');
});

export const authStatus = (_req: Request, res: Response) => {
    res.json({ connected: googleAuth().isConnected() });
};

export const logout = asyncHandler(async (_req, res) => {
    await googleAuth().disconnect();
    res.json({ connected: false });
});
