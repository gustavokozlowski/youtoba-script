require('dotenv').config()
const express = require("express")
const { router } = require('../routes/playlist.routes.js')
const { google } = require('googleapis')
const request = require('request')
const cors = require('cors')
const urlParse = require('url-parse')
const queryParse = require('query-string')
const axios = require('axios')
const jwt = require('jsonwebtoken');


const { PORT, CLIENT_ID, CLIENT_SECRET_KEY, REDIRECT_URL, API_KEY, JWT_SECRET } = process.env


const authenticate = (req, res, next) => {
    const token = req.headers.authorization;
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

module.exports = { authenticate }