require('dotenv').config();

import cors from 'cors';
import express from 'express';

// import { authenticate } from '../middlewares/auth.middlewares'
const { PORT } = process.env;
import cookieParser from 'cookie-parser';
import { routes } from '../routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

app.use('/', routes);

app.listen(PORT, () => {
   console.log(`Servidor rodando liso na porta ${PORT}`);
});
