const express = require('express');
const morgan = require("morgan");
// const { createProxyMiddleware } = require('http-proxy-middleware');
var httpProxy = require('http-proxy');

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

// Proxy endpoints
/*
app.use('/gremlin', createProxyMiddleware({
    target: API_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        [`^/gremlin`]: '',
    },
}));

 */
const proxy = httpProxy.createProxyServer();
app.all('/gremlin', function (req, res) {
    proxy.web(req, res, {
        changeOrigin: true,
        target: API_SERVICE_URL,
        secure: false
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});