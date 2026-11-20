import type { RequestHandler } from 'express';
import type { AsyncRequestHandler } from './async-handler.types';

/** O Express 4 não pega erro de handler assíncrono: este repassa a rejeição para o tratador de erro. */
export const asyncHandler =
    (handler: AsyncRequestHandler): RequestHandler =>
    (req, res, next) => {
        handler(req, res, next).catch(next);
    };
