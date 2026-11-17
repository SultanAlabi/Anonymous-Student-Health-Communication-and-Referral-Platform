import { useEffect, useState } from "react";
import { api, errorMessage } from "../api/client.js";
import { Alert, Button, Spinner } from "../components/ui.jsx";
import { fmt } from "../constants.js";

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [applied, setApplied] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null); setError("");
    api.get("/admin/audit-logs/", { params: { page, action: applied || undefined } }).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [page, applied]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Audit log</h1>
      <p className="mt-1 text-stone-600">Who did what, and when. Logs never contain case content. Anonymous submissions aren’t logged at all.</p>
      <form className="mt-4 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(action.trim()); }}>
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by exact action, e.g. concern.view" aria-label="Filter by action" className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 ring-brand-200" />
        <Button type="submit">Filter</Button>
      </form>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Actor</th><th className="p-3">IP</th></tr></thead>
              <tbody>
                {data.results.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100">
                    <td className="whitespace-nowrap p-3">{fmt(l.created_at)}</td><td className="p-3 font-mono text-xs">{l.action}</td>
                    <td className="p-3 text-xs">{l.target_type}{l.target_id ? ` ${l.target_id.slice(0, 8)}` : ""}</td><td className="p-3 font-mono text-xs">{l.actor_id ? l.actor_id.slice(0, 8) : "—"}</td><td className="p-3 text-xs">{l.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.results.length === 0 && <p className="py-8 text-stone-600">No entries.</p>}
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" disabled={!data.previous} onClick={() => setPage(page - 1)}>Newer</Button>
            <Button variant="outline" disabled={!data.next} onClick={() => setPage(page + 1)}>Older</Button>
            <span className="text-sm text-stone-500">{data.count} entries</span>
          </div>
        </>
      )}
    </div>
  );
}
