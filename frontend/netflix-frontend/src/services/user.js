import api from "./api";

export async function getUserProfile() {
    return api("/users/me");
}

export async function updateUserProfile(data) {
    return api("/users/me", { method: "PUT", body: data });
}

export async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append("avatar", file);
    return api("/users/me/avatar", { method: "POST", body: formData });
}
