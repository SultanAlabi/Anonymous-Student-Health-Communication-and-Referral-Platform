import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";
import Thread from "../components/Thread.jsx";
import { Alert, Badge, Button, Card, Spinner } from "../components/ui.jsx";
import { REFERRAL_STATUS, ROLE_LABEL, SERVICES, URGENCY, fmt, label } from "../constants.js";
import { refreshBell, useAsync } from "../hooks.js";

export default function ReferralDetail() {
  const { id } = useParams();
  const [err, setErr] = useState("");
  const { data, error, loading, reload } = useAsync(async () => {
    const [{ data: referral }, { data: messages }] = await Promise.all([api.get(`/referrals/${id}/`), api.get(`/referrals/${id}/messages/`)]);
    return { referral, messages };
  }, [id]);

  if (loading && !data) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const { referral: r, messages } = data;

  const cancel = async () => {
    if (!window.confirm("Cancel this referral request?")) return;
    setErr("");
    try { await api.patch(`/referrals/${id}/status/`, { status: "closed" }); reload(); } catch (e) { setErr(errorMessage(e)); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/referrals" className="text-sm font-semibold text-brand-700">← All referrals</Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2"><Badge>{REFERRAL_STATUS[r.status]}</Badge><span className="text-xs text-stone-500">{label(URGENCY, r.urgency)} · requested {fmt(r.created_at)}</span></div>
        <h1 className="mt-2 text-2xl font-bold">{label(SERVICES, r.service_type)}</h1>
        {r.note && <p className="mt-2 whitespace-pre-line text-sm">{r.note}</p>}
        <p className="mt-3 text-sm text-stone-600">{r.assigned_role ? `Handled by: ${ROLE_LABEL[r.assigned_role]}` : "Not picked up yet. You’ll be notified when someone takes it."}</p>
        {r.status === "pending" && <Button variant="outline" className="mt-4" onClick={cancel}>Cancel request</Button>}
        {err && <Alert tone="error" className="mt-3">{err}</Alert>}
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-bold">Messages</h2>
      <Thread
        messages={messages}
        canSend={!!r.assigned_role && r.status !== "closed"}
        blockedReason={r.status === "closed" ? "This referral is closed." : "You can message once your referral has been picked up."}
        onSend={async (body) => { await api.post(`/referrals/${id}/messages/`, { body }); refreshBell(); await reload(); }}
      />
    </div>
  );
}
