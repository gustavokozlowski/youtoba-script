import { NextFunction, Request, Response } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}


require('dotenv').config()
// const cors = require('cors')
// const urlParse = require('url-parse')
// const queryParse = require('query-string')
// const axios = require('axios')
import jwt from 'jsonwebtoken';

const { CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL, API_KEY, JWT_SECRET } = process.env

if (!JWT_SECRET) throw new Error('JWT_SECRET must be defined in environment variables');

export const authenticate = (req: Request, res:Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send('Access Denied. No token provided.');
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(400).send('Invalid Token.');
    }
};

export const authenticateGetCookies = (req: Request, res: Response, _next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {

        return res.status(401).send('Access Denied. No Cookies provided.');
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // req.user = decoded;

        res.json({ decoded })

        // next();
    } catch (error) {
        // res.clearCookie("token")

        return res.redirect('/auth');
    }
};
