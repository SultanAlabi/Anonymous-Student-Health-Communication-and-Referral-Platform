import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api/v1";
export const API_BASE = baseURL;

// publicApi never sends credentials: used for anonymous and public pages.
export const publicApi = axios.create({ baseURL });
export const api = axios.create({ baseURL });

// Access token lives in memory only. The refresh token sits in sessionStorage (cleared when the tab closes).
let accessToken = null;
export const tokens = {
  setAccess: (t) => { accessToken = t; },
  getRefresh: () => sessionStorage.getItem("rt"),
  setRefresh: (t) => (t ? sessionStorage.setItem("rt", t) : sessionStorage.removeItem("rt")),
  clear: () => { accessToken = null; sessionStorage.removeItem("rt"); },
};

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && orig && !orig._retry && tokens.getRefresh() && !orig.url.includes("/auth/")) {
      orig._retry = true;
      refreshing = refreshing || publicApi.post("/auth/token/refresh/", { refresh: tokens.getRefresh() }).finally(() => { refreshing = null; });
      try {
        const { data } = await refreshing;
        accessToken = data.access;
        if (data.refresh) tokens.setRefresh(data.refresh);
        orig.headers.Authorization = `Bearer ${data.access}`;
        return api(orig);
      } catch {
        tokens.clear();
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  const r = err?.response;
  if (!r) return "Can't reach the server. Check your connection and try again.";
  if (r.status === 429) return "Too many attempts. Please wait a minute and try again.";
  const d = r.data;
  if (typeof d?.detail === "string") return d.detail;
  if (d && typeof d === "object") {
    const first = Object.values(d).flat()[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

export function fieldErrors(err) {
  const d = err?.response?.data;
  if (!d || typeof d !== "object" || d.detail) return {};
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, [].concat(v).join(" ")]));
}


// Authenticated download (drafts are private, so a plain link can't carry the login token).
export async function saveBlob(path, name) {
  const r = await api.get(`/${path}`, { responseType: "blob" });
  const url = URL.createObjectURL(r.data);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}