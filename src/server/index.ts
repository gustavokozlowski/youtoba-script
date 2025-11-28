require('dotenv').config();

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { routes } from '../routes';

const { PORT } = process.env;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

app.use('/', routes);

app.listen(PORT, () => {
    console.log(`Servidor rodando liso na porta ${PORT}`);
});
