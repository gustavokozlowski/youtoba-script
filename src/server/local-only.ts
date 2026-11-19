import type { NextFunction, Request, Response } from 'express';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Únicas páginas que outro site pode abrir: a volta do login do Google e a página inicial.
const CROSS_SITE_ENTRY_POINTS = new Set(['/', '/auth', '/auth/login']);

const hostnameOf = (host: string) => (host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]);

const forbid = (res: Response, erro: string, mensagem: string) => res.status(403).json({ erro, mensagem });

/**
 * O servidor só atende a própria máquina e a própria interface.
 * - Host local: barra DNS rebinding (um domínio externo que passa a apontar para 127.0.0.1).
 * - Origin igual ao Host nas escritas: barra outro site disparando DELETE/POST.
 * - Sec-Fetch-Site: barra leituras disparadas por outro site (ex.: <img> gastando quota).
 * Pedidos sem esses headers (curl, scripts) passam: não vêm de uma página aberta no navegador.
 */
export function localOnly() {
    return (req: Request, res: Response, next: NextFunction) => {
        const host = req.headers.host ?? '';
        if (!LOCAL_HOSTNAMES.has(hostnameOf(host).toLowerCase())) {
            return forbid(res, 'host_not_allowed', 'Este servidor só atende localhost.');
        }

        const origin = req.headers.origin;
        if (!SAFE_METHODS.has(req.method) && origin !== undefined && origin !== `${req.protocol}://${host}`) {
            return forbid(res, 'cross_origin_blocked', 'Pedido de outro site recusado.');
        }

        const site = req.headers['sec-fetch-site'];
        if (site === 'cross-site' || site === 'same-site') {
            const isEntryNavigation =
                req.method === 'GET' &&
                req.headers['sec-fetch-mode'] === 'navigate' &&
                CROSS_SITE_ENTRY_POINTS.has(req.path);
            if (!isEntryNavigation) {
                return forbid(res, 'cross_origin_blocked', 'Pedido de outro site recusado.');
            }
        }

        return next();
    };
}
