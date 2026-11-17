import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, publicApi, tokens } from "../api/client.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data } = await api.get("/auth/profile/");
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      const refresh = tokens.getRefresh();
      if (refresh) {
        try {
          const { data } = await publicApi.post("/auth/token/refresh/", { refresh });
          tokens.setAccess(data.access);
          if (data.refresh) tokens.setRefresh(data.refresh);
          await loadProfile();
        } catch {
          tokens.clear();
        }
      }
      setLoading(false);
    })();
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [loadProfile]);

  const login = async (email, password) => {
    const { data } = await publicApi.post("/auth/login/", { email, password });
    tokens.setAccess(data.access);
    tokens.setRefresh(data.refresh);
    return loadProfile();
  };

  const logout = async () => {
    const refresh = tokens.getRefresh();
    try { if (refresh) await api.post("/auth/logout/", { refresh }); } catch { /* clear locally regardless */ }
    tokens.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
