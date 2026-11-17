import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api/client.js";

// Loads every page of a paginated list endpoint (capped for safety).
export async function fetchAll(path, params = {}) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await api.get(path, { params: { ...params, page } });
    out.push(...data.results);
    if (!data.next) break;
  }
  return out;
}

export function useAsync(fn, deps = []) {
  const [s, setS] = useState({ data: null, error: "", loading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setS((p) => ({ ...p, loading: true, error: "" }));
    return fn().then((data) => setS({ data, error: "", loading: false }))
      .catch((e) => setS({ data: null, error: errorMessage(e), loading: false }));
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...s, reload: run };
}

export const refreshBell = () => window.dispatchEvent(new Event("notifications:refresh"));
