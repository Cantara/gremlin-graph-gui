require('dotenv').config();
const express = require('express');
const morgan = require("morgan");
var httpProxy = require('http-proxy');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const logger = require('debug')('express');

const audience = process.env.JWT_AUDIENCE;
const issuer = process.env.JWT_ISSUER;
const jwksUri = process.env.OPENID_JWKS_URI;
const clientId = process.env.OPENID_CLIENT_ID;
const authorizeUri = process.env.OPENID_AUTHORIZE_URI;

// Create Express Server
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.DNS_HOSTNAME || "localhost";
const API_SERVICE_URL = process.env.GREMLIN_URI;

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
    function buildRedirectUri() {
        if (HOST == "localhost") {
            return encodeURI("http://localhost:" + PORT + "/token/");
        } else {
            return encodeURI("https://" + HOST + ":" + PORT + "/token");
        }
    }

    res.redirect(authorizeUri +'?' +
        'client_id='+ clientId +
        '&response_type=id_token%20token' +
        '&redirect_uri=' + buildRedirectUri() +
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
    res.cookie("jwt", idToken, {secure: false});
    res.redirect("/");
    // res.json({
    //     status: "ok",
    //     token: idToken,
    //     accessToken
    // });
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
        jwksUri: jwksUri
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
        jwksUri: jwksUri
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