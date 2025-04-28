import api from "./api";

export async function signup(username, email, password) {
    return api("/auth/signup", {
        method: "POST",
        body: { username, email, password },
    });
}

export async function login(email, password) {
    const data = await api("/auth/login", {
        method: "POST",
        body: { email, password },
    });
    sessionStorage.setItem("accessToken", data.accessToken);
    sessionStorage.setItem("refreshToken", data.refreshToken);
    return data;
}

export async function refreshToken() {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token available");
    const data = await api("/auth/refresh", {
        method: "POST",
        body: { token: refreshToken },
    });
    sessionStorage.setItem("accessToken", data.accessToken);
    return data;
}

export async function logout() {
    await api("/auth/logout", { method: "POST" });
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
}
