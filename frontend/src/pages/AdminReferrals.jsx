import { useState } from "react";
import { api, errorMessage } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { REFERRAL_STATUS, ROLE_LABEL, SERVICES, URGENCY, fmtDate, label } from "../constants.js";
import { fetchAll, useAsync } from "../hooks.js";

export default function AdminReferrals() {
  const [status, setStatus] = useState("pending");
  const [pick, setPick] = useState({});
  const [err, setErr] = useState("");
  const list = useAsync(() => fetchAll("/referrals/monitor/", { status: status || undefined }), [status]);
  const staff = useAsync(async () => (await Promise.all(["ambassador", "professional"].map((r) => fetchAll("/admin/users/", { role: r })))).flat().filter((u) => u.is_active));

  const assign = async (id) => {
    setErr("");
    try { await api.post(`/referrals/${id}/assign/`, { assignee: pick[id] }); list.reload(); } catch (e) { setErr(errorMessage(e)); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Referral monitor</h1>
      <p className="mt-1 text-stone-600">Metadata only: you can assign and track referrals but you can’t see the student or their note.</p>
      <div className="mt-4 max-w-xs">
        <Field as="select" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>{Object.entries(REFERRAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Field>
      </div>
      {err && <Alert tone="error" className="mt-4">{err}</Alert>}
      {list.loading && <Spinner />}
      {list.error && <Alert tone="error" className="mt-4">{list.error}</Alert>}
      {list.data?.length === 0 && <p className="py-10 text-stone-600">No referrals with this status.</p>}
      <div className="mt-5 space-y-3">
        {list.data?.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center gap-2"><Badge>{REFERRAL_STATUS[r.status]}</Badge><span className="text-xs text-stone-500">{label(URGENCY, r.urgency)}{r.urgency === "urgent" ? " ⚠" : ""} · {fmtDate(r.created_at)}{r.assigned_role ? ` · with ${ROLE_LABEL[r.assigned_role]}` : ""}</span></div>
            <h3 className="mt-1 font-bold">{label(SERVICES, r.service_type)}</h3>
            {["pending", "assigned"].includes(r.status) && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[14rem] flex-1">
                  <Field as="select" label={r.status === "assigned" ? "Reassign to" : "Assign to"} value={pick[r.id] || ""} onChange={(e) => setPick({ ...pick, [r.id]: e.target.value })}>
                    <option value="">Choose…</option>
                    {staff.data?.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({ROLE_LABEL[u.role]})</option>)}
                  </Field>
                </div>
                <Button disabled={!pick[r.id]} onClick={() => assign(r.id)}>Assign</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
