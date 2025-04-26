import express from "express";
import fetch from "node-fetch";
import config from "../../config/index.js";

const router = express.Router();

// GET /home -> aggregate profile watchlist and recommendations
router.get("/", async (req, res) => {
    const userId = req.auth?.sub;
    if (!userId) {
        return res.status(401).json({ error: "User ID missing in token" });
    }
    try {
        const endpoints = [
            `${config.services.profile}/${userId}/watchlist`,
            `${config.services.rec}/${userId}`,
        ];
        const [watchlistResp, recsResp] = await Promise.all(
            endpoints.map((url) =>
                fetch(url, {
                    headers: { authorization: req.headers.authorization },
                })
            )
        );
        if (!watchlistResp.ok || !recsResp.ok) {
            return res
                .status(502)
                .json({ error: "Failed to fetch from upstream services" });
        }
        const [watchlist, recs] = await Promise.all([
            watchlistResp.json(),
            recsResp.json(),
        ]);
        return res.json({ watchlist, recs });
    } catch (err) {
        return res
            .status(500)
            .json({ error: "Aggregation error", details: err.message });
    }
});

export default router;
