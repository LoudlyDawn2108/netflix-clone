const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

async function api(path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    const headers = {
        ...(options.headers || {}),
    };
    const token = sessionStorage.getItem("accessToken");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, {
        credentials: "include",
        ...options,
        headers,
    });
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }
    if (!response.ok) {
        const error = data?.error || response.statusText;
        throw new Error(error);
    }
    return data;
}

export default api;
