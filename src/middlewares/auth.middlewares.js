require('dotenv').config()
// const cors = require('cors')
// const urlParse = require('url-parse')
// const queryParse = require('query-string')
// const axios = require('axios')
const jwt = require('jsonwebtoken');


const { PORT, CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL, API_KEY, JWT_SECRET } = process.env

const authenticate = (req, res, next) => {
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

const authenticateGetCookies = (req, res, next) => {
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

module.exports = { authenticate }