import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";
import { Alert, Badge, Button, Card, Spinner, Tabs } from "../components/ui.jsx";
import { APPT_STATUS, CONCERN_CATEGORIES, CONCERN_STATUS, WINDOWS, fmtDate, fmt, label } from "../constants.js";
import { fetchAll, useAsync } from "../hooks.js";

export function QueueList({ title, intro, queuePath, assignedPath, claimPath, base, statusLabels, heading, meta, assignedLabel = "Assigned to me" }) {
  const nav = useNavigate();
  const [tab, setTab] = useState("queue");
  const [err, setErr] = useState("");
  const q = useAsync(() => fetchAll(queuePath));
  const a = useAsync(() => fetchAll(assignedPath));
  const cur = tab === "queue" ? q : a;

  const claim = async (id) => {
    setErr("");
    try { await api.post(claimPath(id)); nav(`${base}/${id}`); }
    catch (e) { setErr(errorMessage(e)); q.reload(); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-stone-600">{intro}</p>
      <Tabs tabs={[["queue", `Waiting (${q.data?.length ?? "…"})`], ["mine", `${assignedLabel} (${a.data?.length ?? "…"})`]]} value={tab} onChange={setTab} />
      {err && <Alert tone="error" className="mt-4">{err}</Alert>}
      {cur.loading && <Spinner />}
      {cur.error && <Alert tone="error" className="mt-4">{cur.error}</Alert>}
      {cur.data?.length === 0 && <p className="py-10 text-stone-600">Nothing here.</p>}
      <div className="mt-5 space-y-3">
        {cur.data?.map((i) => (
          <Card key={i.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2"><Badge>{statusLabels[i.status]}</Badge><span className="text-xs text-stone-500">{meta(i)}</span></div>
              <h3 className="mt-1 font-bold">{heading(i)}</h3>
            </div>
            {tab === "queue" && claimPath ? <Button onClick={() => claim(i.id)}>Pick up</Button> : <Link to={`${base}/${i.id}`} className="text-sm font-semibold text-brand-700 underline">Open</Link>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export const AnonymousList = () => (
  <QueueList title="Anonymous cases" intro="The student’s identity is not known to you or anyone else, so please don’t try to identify them." queuePath="/anonymous-concerns/queue/" assignedPath="/anonymous-concerns/assigned/"
    claimPath={(id) => `/anonymous-concerns/${id}/claim/`} base="/staff/anonymous" statusLabels={CONCERN_STATUS} heading={(i) => i.subject} meta={(i) => `${label(CONCERN_CATEGORIES, i.category)} · ${fmtDate(i.created_at)}`} />
);
export const ConcernList = () => (
  <QueueList title="Confidential cases" intro="Students who asked for personal help. Opening a case is recorded in the audit log." queuePath="/concerns/queue/" assignedPath="/concerns/assigned/"
    claimPath={(id) => `/concerns/${id}/claim/`} base="/staff/concerns" statusLabels={CONCERN_STATUS} heading={(i) => i.subject} meta={(i) => `${label(CONCERN_CATEGORIES, i.category)} · ${fmtDate(i.created_at)}`} />
);
export const AppointmentList = () => (
  <QueueList title="Appointment requests" intro="Open a request to approve, reschedule or decline it. The first person to respond handles it." queuePath="/appointments/queue/" assignedPath="/appointments/assigned/"
    base="/staff/appointments" statusLabels={APPT_STATUS} assignedLabel="Handled by me" heading={(i) => label(CONCERN_CATEGORIES, i.reason_category)}
    meta={(i) => (i.scheduled_at ? `Scheduled ${fmt(i.scheduled_at)}` : `Requested ${fmtDate(i.created_at)}${i.preferred_date ? ` · prefers ${fmtDate(i.preferred_date)} (${label(WINDOWS, i.preferred_window).toLowerCase()})` : ""}`)} />
);
