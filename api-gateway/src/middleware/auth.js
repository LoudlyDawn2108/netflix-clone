import { expressjwt as jwt } from "express-jwt";
import jwksRsa from "jwks-rsa";

const jwtCheck = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: process.env.JWKS_URI,
    }),
    audience: process.env.AUDIENCE,
    issuer: process.env.ISSUER,
    algorithms: ["RS256"],
});

export default jwtCheck;
