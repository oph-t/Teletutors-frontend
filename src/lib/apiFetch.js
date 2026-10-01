export async function apiFetch(url, options) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        window.location.href = "/admin";
        throw new Error("Not authenticated");
    }
    return res;
}