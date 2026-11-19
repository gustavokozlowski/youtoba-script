import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { routes } from '../routes';

export function createApp() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors());
    app.use(cookieParser());
    app.use('/', routes);
    return app;
}
