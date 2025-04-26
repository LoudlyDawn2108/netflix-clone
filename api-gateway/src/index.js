import "dotenv/config";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import config from "../config/index.js";
import jwtCheck from "./middleware/auth.js";
import {
    collectDefaultMetrics,
    Counter,
    Histogram,
    Registry,
} from "prom-client";
import homeRouter from "./routes/home.js";

const app = express();

// Security, CORS, logging, and body parsing
app.use(helmet());
// Content Security Policy
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'"],
        },
    })
);
app.use(cors());
app.use(morgan("combined"));
// JSON body parsing with size limit
app.use(express.json({ limit: process.env.BODY_LIMIT || "1mb" }));

const { version, allowedIPs, services, rateLimit: rlConfig } = config;

// API version enforcement
app.use((req, res, next) => {
    if (req.path === "/health") return next();
    if (!req.path.startsWith(`/${version}/`)) {
        return res.status(404).json({ error: "Unsupported API version" });
    }
    next();
});

// IP allow‑list
app.use((req, res, next) => {
    if (allowedIPs.length === 0) return next();
    const clientIP = req.ip;
    if (!allowedIPs.includes(clientIP)) {
        return res.status(403).json({ error: "IP not allowed" });
    }
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: rlConfig.windowMs,
    max: rlConfig.maxRequests,
});
app.use(limiter);

// Authentication (OAuth2/OIDC JWT validation)
app.use(jwtCheck.unless({ path: ["/health"] }));

// Proxy routing with version prefix
Object.entries(services).forEach(([name, url]) => {
    app.use(
        `/${version}/${name}`,
        createProxyMiddleware({
            target: url,
            changeOrigin: true,
            pathRewrite: { [`^/${version}/${name}`]: "" },
        })
    );
});

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "OK" }));

// Prometheus metrics setup
const register = new Registry();
collectDefaultMetrics({ register });

const requestCount = new Counter({
    name: "api_gateway_requests_total",
    help: "Total number of requests",
    labelNames: ["method", "route", "status"],
    registers: [register],
});

const requestDuration = new Histogram({
    name: "api_gateway_request_duration_seconds",
    help: "Request duration in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register],
});

// Metrics middleware
app.use((req, res, next) => {
    const end = requestDuration.startTimer({
        method: req.method,
        route: req.route?.path || req.path,
    });
    res.on("finish", () => {
        requestCount.inc({
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode,
        });
        end({ status: res.statusCode });
    });
    next();
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

// Aggregation route for home (watchlist + recommendations)
app.use(`/${version}/home`, homeRouter);

// Global error handler for authentication and other errors
app.use((err, req, res, next) => {
    if (err.name === "UnauthorizedError") {
        return res.status(401).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Gateway listening on port ${PORT}`));
