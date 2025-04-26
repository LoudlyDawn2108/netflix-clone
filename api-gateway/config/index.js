import "dotenv/config";

export const services = {
    auth: process.env.AUTH_URL,
    profile: process.env.PROFILE_URL,
    "video-mgmt": process.env.VIDEO_MGMT_URL,
    transcoding: process.env.TRANSCODING_URL,
    "catalog-search": process.env.CATALOG_SEARCH_URL,
    "playback-drm": process.env.PLAYBACK_DRM_URL,
    rec: process.env.REC_URL,
    analytics: process.env.ANALYTICS_URL,
    billing: process.env.BILLING_URL,
};

export const rateLimit = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
};

export const version = process.env.API_VERSION || "v1";
export const allowedIPs = (process.env.ALLOWED_IPS || "")
    .split(",")
    .filter(Boolean);

export default { services, rateLimit };
