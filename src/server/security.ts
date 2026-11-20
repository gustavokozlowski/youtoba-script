import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

const TEN_MINUTES = 10 * 60_000;
// Só as rotas que começam um login ou trocam um code com o Google. /auth/status fica de fora:
// a interface lê o status a cada carga, e um 429 ali mandaria a pessoa para a tela de login.
const LOGIN_PATHS = new Set(['/auth', '/auth/login']);
const LOGIN_LIMIT = 20;

/**
 * Cabeçalhos de segurança. A CSP aceita só o próprio app, mais as miniaturas do YouTube.
 * - style-src com 'unsafe-inline': as páginas de erro do login têm um <style> embutido.
 * - Sem HSTS e sem upgrade-insecure-requests: o servidor roda em http://localhost.
 */
export const securityHeaders = () =>
    helmet({
        contentSecurityPolicy: {
            directives: {
                'img-src': ["'self'", 'data:', 'https://*.ytimg.com'],
                'style-src': ["'self'", "'unsafe-inline'"],
                'font-src': ["'self'", 'data:'],
                'frame-ancestors': ["'none'"],
                'upgrade-insecure-requests': null,
            },
        },
        strictTransportSecurity: false,
    });

/** Teto de tentativas de login por janela. Uma instância por app, para cada servidor contar o seu. */
export const loginRateLimit = () =>
    rateLimit({
        windowMs: TEN_MINUTES,
        limit: LOGIN_LIMIT,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: (req) => !LOGIN_PATHS.has(req.path),
        handler: (_req, res) => {
            res.status(429).json({
                erro: 'too_many_requests',
                mensagem: 'Muitas tentativas de login. Espere alguns minutos e tente de novo.',
            });
        },
    });
