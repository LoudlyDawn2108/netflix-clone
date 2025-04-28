import api from "./api";

// Request a DRM license for the given video URL
export async function requestDrmLicense(videoUrl) {
    return api("/drm/license", { method: "POST", body: { url: videoUrl } });
}
