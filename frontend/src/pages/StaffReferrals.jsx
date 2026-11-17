import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";
import { Alert, Badge, Button, Card, Spinner, Tabs } from "../components/ui.jsx";
import { REFERRAL_STATUS, SERVICES, URGENCY, fmtDate, label } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAll, useAsync } from "../hooks.js";

export default function StaffReferrals() {
  const { user } = useAuth();
  const nav = useNavigate();
  const amb = user.role === "ambassador";
  const [tab, setTab] = useState(amb ? "pool" : "mine");
  const [err, setErr] = useState("");
  const pool = useAsync(() => (amb ? fetchAll("/referrals/pool/") : Promise.resolve([])));
  const mine = useAsync(() => fetchAll("/referrals/assigned/"));
  const cur = tab === "pool" ? pool : mine;

  const claim = async (id) => {
    setErr("");
    try { await api.post(`/referrals/${id}/claim/`); nav(`/staff/referrals/${id}`); }
    catch (e) { setErr(errorMessage(e)); pool.reload(); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Referrals</h1>
      <p className="mt-1 text-stone-600">{amb ? "Pick up a referral to see the student’s note. The pool shows only the service and urgency." : "Referrals an administrator has assigned to you."}</p>
      {amb && <Tabs tabs={[["pool", `Pool (${pool.data?.length ?? "…"})`], ["mine", `Assigned to me (${mine.data?.length ?? "…"})`]]} value={tab} onChange={setTab} />}
      {err && <Alert tone="error" className="mt-4">{err}</Alert>}
      {cur.loading && <Spinner />}
      {cur.error && <Alert tone="error" className="mt-4">{cur.error}</Alert>}
      {cur.data?.length === 0 && <p className="py-10 text-stone-600">Nothing here.</p>}
      <div className="mt-5 space-y-3">
        {cur.data?.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {r.status && <Badge>{REFERRAL_STATUS[r.status]}</Badge>}
                <span className="text-xs text-stone-500">{label(URGENCY, r.urgency)}{r.urgency === "urgent" ? " ⚠" : ""} · {fmtDate(r.created_at)}{r.student_first_name ? ` · ${r.student_first_name}` : ""}</span>
              </div>
              <h3 className="mt-1 font-bold">{label(SERVICES, r.service_type)}</h3>
            </div>
            {tab === "pool" ? <Button onClick={() => claim(r.id)}>Pick up</Button> : <Link to={`/staff/referrals/${r.id}`} className="text-sm font-semibold text-brand-700 underline">Open</Link>}
          </Card>
        ))}
      </div>
    </div>
  );
}
