import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";
import Thread from "../components/Thread.jsx";
import { Alert, Badge, Button, Card, Spinner } from "../components/ui.jsx";
import { REFERRAL_STATUS, SERVICES, URGENCY, fmt, label } from "../constants.js";
import { refreshBell, useAsync } from "../hooks.js";

const NEXT = { assigned: [["in_progress", "Start work"]], in_progress: [["referred", "Mark as referred"]], referred: [["completed", "Mark as completed"]] };

export default function StaffReferralDetail() {
  const { id } = useParams();
  const [err, setErr] = useState("");
  const { data, error, loading, reload } = useAsync(async () => {
    const [{ data: referral }, { data: messages }] = await Promise.all([api.get(`/referrals/${id}/`), api.get(`/referrals/${id}/messages/`)]);
    return { referral, messages };
  }, [id]);
  if (loading && !data) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const { referral: r, messages } = data;
  const s = r.student || {};

  const move = async (status) => {
    if (status === "closed" && !window.confirm("Close this referral?")) return;
    setErr("");
    try { await api.patch(`/referrals/${id}/status/`, { status }); reload(); } catch (e) { setErr(errorMessage(e)); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/staff/referrals" className="text-sm font-semibold text-brand-700">← Referrals</Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2"><Badge>{REFERRAL_STATUS[r.status]}</Badge><span className="text-xs text-stone-500">{label(URGENCY, r.urgency)} · {fmt(r.created_at)}</span></div>
        <h1 className="mt-2 text-2xl font-bold">{label(SERVICES, r.service_type)}</h1>
        <p className="mt-1 text-sm text-stone-600">Student: {s.name || s.first_name}{s.student_number ? ` · ${s.student_number}` : ""}{s.department ? ` · ${s.department}` : ""}</p>
        {r.note ? <p className="mt-3 whitespace-pre-line rounded-xl bg-stone-100 p-3 text-sm">{r.note}</p> : <p className="mt-3 text-sm text-stone-500">No note from the student.</p>}
        {r.status !== "closed" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(NEXT[r.status] || []).map(([st, text]) => <Button key={st} onClick={() => move(st)}>{text}</Button>)}
            <Button variant="outline" onClick={() => move("closed")}>Close</Button>
          </div>
        )}
        {err && <Alert tone="error" className="mt-3">{err}</Alert>}
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-bold">Messages with the student</h2>
      <p className="mb-3 text-xs text-stone-500">Keep to what’s needed to arrange the referral. Don’t ask for medical details.</p>
      <Thread messages={messages} canSend={r.status !== "closed"} blockedReason="This referral is closed."
        onSend={async (body) => { await api.post(`/referrals/${id}/messages/`, { body }); refreshBell(); await reload(); }} />
    </div>
  );
}
