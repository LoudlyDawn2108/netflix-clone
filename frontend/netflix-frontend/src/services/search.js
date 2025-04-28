import api from "./api";

export async function searchVideos(query, filters = {}, page = 1) {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (filters.genre) params.append("genre", filters.genre);
    if (filters.year) params.append("year", filters.year);
    params.append("page", page);
    return api(`/videos/search?${params.toString()}`);
}

export async function getSearchSuggestions(query) {
    const params = new URLSearchParams({ query });
    return api(`/videos/search/suggestions?${params.toString()}`);
}
