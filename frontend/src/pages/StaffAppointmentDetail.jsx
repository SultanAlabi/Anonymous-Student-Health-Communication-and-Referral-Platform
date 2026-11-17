import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { APPT_STATUS, CONCERN_CATEGORIES, WINDOWS, fmt, fmtDate, label } from "../constants.js";
import { useAsync } from "../hooks.js";

const ACTIONS = {
  requested: [["approved", "Approve", true], ["rejected", "Decline", false]],
  approved: [["rescheduled", "Reschedule", true], ["completed", "Mark completed", false], ["cancelled", "Cancel", false]],
  rescheduled: [["rescheduled", "Reschedule", true], ["completed", "Mark completed", false], ["cancelled", "Cancel", false]],
};

export default function StaffAppointmentDetail() {
  const { id } = useParams();
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const { data: a, error, loading, reload } = useAsync(() => api.get(`/appointments/${id}/`).then((r) => r.data), [id]);
  if (loading && !a) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;

  const act = async (status, needsTime) => {
    setErr("");
    if (needsTime && !when) return setErr("Choose a date and time first.");
    try {
      await api.patch(`/appointments/${id}/status/`, { status, ...(needsTime ? { scheduled_at: new Date(when).toISOString() } : {}), ...(note ? { staff_note: note } : {}) });
      setWhen(""); setNote(""); reload();
    } catch (e) { setErr(errorMessage(e)); }
  };
  const actions = ACTIONS[a.status] || [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/staff/appointments" className="text-sm font-semibold text-brand-700">← Appointment requests</Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2"><Badge>{APPT_STATUS[a.status]}</Badge><span className="text-xs text-stone-500">Requested {fmt(a.created_at)}</span></div>
        <h1 className="mt-2 text-2xl font-bold">{label(CONCERN_CATEGORIES, a.reason_category)}</h1>
        {a.student && <p className="mt-1 text-sm text-stone-600">{a.student.name}{a.student.student_number ? ` · ${a.student.student_number}` : ""}{a.student.department ? ` · ${a.student.department}` : ""}</p>}
        {a.reason ? <p className="mt-3 whitespace-pre-line rounded-xl bg-stone-100 p-3 text-sm">{a.reason}</p> : <p className="mt-3 text-sm text-stone-500">No details given.</p>}
        <p className="mt-3 text-sm text-stone-600">Preferred: {a.preferred_date ? `${fmtDate(a.preferred_date)} (${label(WINDOWS, a.preferred_window).toLowerCase()})` : "no preference"}</p>
        {a.scheduled_at && <p className="mt-1 font-display text-lg font-bold">Scheduled: {fmt(a.scheduled_at)}</p>}
        {a.staff_note && <p className="mt-1 text-sm"><span className="font-semibold">Note to student:</span> {a.staff_note}</p>}
      </Card>
      {actions.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-bold">Respond</h2>
          <Field label="Date and time (for approve / reschedule)" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          <Field as="textarea" rows={2} label="Note to the student (location, instructions, or the reason if declining)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          {err && <Alert tone="error" className="mt-3">{err}</Alert>}
          <div className="mt-4 flex flex-wrap gap-2">{actions.map(([st, text, t], i) => <Button key={st} variant={i === 0 ? "primary" : "outline"} onClick={() => act(st, t)}>{text}</Button>)}</div>
        </Card>
      )}
    </div>
  );
}
