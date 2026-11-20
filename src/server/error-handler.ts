import type { ErrorRequestHandler } from 'express';
import { errorMessage, httpErrorLike } from '../shared/errors';
import type { ClientErrorReply, ErrorLog } from './error-handler.types';

// Erros do parser de JSON do Express: culpa do pedido, não do servidor.
const CLIENT_ERRORS: Partial<Record<string, ClientErrorReply>> = {
    'entity.parse.failed': { status: 400, erro: 'invalid_json', mensagem: 'O corpo do pedido não é um JSON válido.' },
    'entity.too.large': { status: 413, erro: 'payload_too_large', mensagem: 'O corpo do pedido passou de 64 KB.' },
};

const clientErrorOf = (error: unknown) =>
    typeof error === 'object' && error !== null && 'type' in error && typeof error.type === 'string'
        ? CLIENT_ERRORS[error.type]
        : undefined;

/**
 * Último middleware do app: todo erro passa por aqui. O log leva só método, caminho, status e
 * mensagem; o objeto do erro nunca vai para o log (ele pode carregar o header Authorization).
 */
export const errorHandler =
    (log: ErrorLog): ErrorRequestHandler =>
    (error, req, res, next) => {
        if (res.headersSent) return next(error);

        const known = clientErrorOf(error);
        if (known) {
            res.status(known.status).json({ erro: known.erro, mensagem: known.mensagem });
            return;
        }
        const status = httpErrorLike(error).response?.status;
        log.error({ method: req.method, path: req.path, status, error: errorMessage(error) }, 'Erro inesperado');
        res.status(500).json({ erro: 'internal_error', mensagem: 'Erro interno. Veja o terminal do servidor.' });
    };
