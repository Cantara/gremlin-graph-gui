const express = require('express');
const morgan = require("morgan");
var httpProxy = require('http-proxy');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const logger = require('debug')('express');

const jwksHost = process.env.JWKS_HOST;
const audience = process.env.AUDIENCE || '7bb8baf3-39e2-4a21-96cf-863a00af450b';
const issuer = process.env.ISSUER || 'https://login.microsoftonline.com/1e60243c-eab7-4f24-aa6f-1834217eabfa/v2.0' ;

// Create Express Server
const app = express();

// Configuration
const PORT = 3000;
const HOST = "localhost";
const API_SERVICE_URL = "https://localhost:8182/";

// Logging
app.use(morgan('dev'));

// Info GET endpoint
app.get('/info', (req, res, next) => {
    res.send('This is a proxy service which proxies to Billing and Account APIs.');
});

// Authorization
// app.use('', (req, res, next) => {
//     if (req.headers.authorization) {
//         next();
//     } else {
//         res.sendStatus(403);
//     }
// });

app.use(express.static('public'));
app.get('/login', (req, res) => {
    res.redirect('https://login.microsoftonline.com/1e60243c-eab7-4f24-aa6f-1834217eabfa/oauth2/v2.0/authorize?' +
        'client_id=7bb8baf3-39e2-4a21-96cf-863a00af450b' +
        '&response_type=id_token%20token' +
        '&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Ftoken%2F' +
        '&response_mode=form_post' +
        '&scope=openid+profile+email' +
        '&state=12345' +
        '&nonce=678910')
});

app.post('/token/', urlencodedParser, (req, res) => {
    let idToken = req.body.id_token || req.query.id_token;
    logger("token", idToken);
    let accessToken = req.body.access_token || req.query.access_token;
    logger("accessToken", accessToken)
    res.cookie("jwt", idToken, {secure: false})
    res.json({
        status: "ok",
        token: idToken,
        accessToken
    });
    // let auth = "Bearer " + req.body.id_token;
    // res.header('Authorization', auth).redirect("/me");
    // res.json({
    //   body: req.body.id_token
    // });
});

app.get('/me', jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 2,
        jwksUri: `https://login.microsoftonline.com/1e60243c-eab7-4f24-aa6f-1834217eabfa/discovery/v2.0/keys`
    }),
    audience: audience,
    issuer: issuer,
    algorithms: [ 'RS256' ]
}), (req, res) => {
    if (!req.user) return res.sendStatus(401);
    res.json({
        user: req.user
    });
});

// Proxy endpoints
const proxy = httpProxy.createProxyServer();
app.all('/gremlin', jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 2,
        jwksUri: `https://login.microsoftonline.com/1e60243c-eab7-4f24-aa6f-1834217eabfa/discovery/v2.0/keys`
    }),
    audience: audience,
    issuer: issuer,
    algorithms: [ 'RS256' ]
}), (req, res) => {
    proxy.web(req, res, {
        changeOrigin: true,
        target: API_SERVICE_URL,
        secure: false
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});