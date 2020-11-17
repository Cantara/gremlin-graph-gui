const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

let checkToken = async (req, res, next) => {
    let ssoToken = req.headers['x-access-token'] || req.headers['authorization'] || req.query.token; // Express headers are auto converted to lowercase
    let idToken = req.query.id_token || req.body.id_token;
    let authClientState = req.query.state || req.body.state;
    if (idToken) {
        ssoToken = idToken;
    }
    if (ssoToken && ssoToken.startsWith('Bearer ')) {
        // Remove Bearer from string
        ssoToken = ssoToken.slice(7, ssoToken.length);
    }
    if (ssoToken) {
        console.log("Token: ", ssoToken);
        jwt({
            secret: jwksRsa.expressJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 2,
                jwksUri: `https://login.microsoftonline.com/1e60243c-eab7-4f24-aa6f-1834217eabfa/discovery/v2.0/keys`
            }),
            audience: audience,
            issuer: issuer,
            algorithms: [ 'RS256' ]
        })
        //TODO
        ssoToken = ssoToken.replace(/\"/g, '');
        // token = token.replace("%22", "");
        console.log("***" + ssoToken);
        // let jwtSecret = process.env.JWT_SECRET || config.jwtSecret;
        jwt.verify(ssoToken, whydahSsoSecret, (err, decoded) => {
            if (err) {
                console.log("err: ", err);
                return res.json({
                    success: false,
                    message: 'Token is not valid'
                });
            } else {
                req.decoded = decoded;
                console.log("Decoded: " + decoded);
                next();
            }
        });
    } else {
        console.log("Redirect. authcode:", authCode, ", token: ", ssoToken);
        //authorize?response_type=code&client_id=rvMFAu67PX2s.eoWWuD0JTQGH7m03gXiKFjMlmNyAJE-&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F&scope=openid%20email%20phone&state=1234zy"
        const authorizeUrl = whydahSsoUrl + "/authorize?response_type=code&scope=openid%20email&state=1234zy" +
            "&client_id=" + whydahSsoClientId +
            "&redirect_url=" + encodeURI(redirectUrl);
        console.log("Redirect. authcode:", authCode, ", token: ", ssoToken, " authorizeUrl: ", authorizeUrl);
        return res.redirect(301, authorizeUrl);
    }
};

module.exports = {
    checkToken: checkToken
}