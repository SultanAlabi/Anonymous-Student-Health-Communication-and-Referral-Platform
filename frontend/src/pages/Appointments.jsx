import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, errorMessage, fieldErrors } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { APPT_STATUS, CONCERN_CATEGORIES, WINDOWS, fmt, fmtDate, label } from "../constants.js";
import { fetchAll, useAsync } from "../hooks.js";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

function NewAppointment({ onDone }) {
  const [f, setF] = useState({ reason_category: "general", reason: "", preferred_date: "", preferred_window: "any" });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setErrs({});
    try { await api.post("/appointments/", { ...f, preferred_date: f.preferred_date || null }); onDone(); }
    catch (err) { const fe = fieldErrors(err); setErrs(fe); setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <Card className="mt-5">
      <h2 className="text-lg font-bold">Request an appointment</h2>
      <p className="text-sm text-stone-600">Your request goes to the university health centre. They’ll confirm a time, so this isn’t booked until you see “Approved”.</p>
      <form onSubmit={submit} noValidate>
        <Field as="select" label="What is it about?" value={f.reason_category} onChange={set("reason_category")} error={errs.reason_category}>{CONCERN_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
        <Field as="textarea" rows={3} label="Anything the health centre should know (optional)" maxLength={500} value={f.reason} onChange={set("reason")} error={errs.reason} />
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Preferred date (optional)" type="date" min={today()} value={f.preferred_date} onChange={set("preferred_date")} error={errs.preferred_date} />
          <Field as="select" label="Preferred time" value={f.preferred_window} onChange={set("preferred_window")} error={errs.preferred_window}>{WINDOWS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
        </div>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
        <Button type="submit" className="mt-4" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
      </form>
    </Card>
  );
}

export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const [show, setShow] = useState(params.get("new") === "1");
  const [err, setErr] = useState("");
  const { data, error, loading, reload } = useAsync(() => fetchAll("/appointments/my/"));

  const cancel = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    setErr("");
    try { await api.patch(`/appointments/${id}/status/`, { status: "cancelled" }); reload(); } catch (e) { setErr(errorMessage(e)); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <Button onClick={() => { setShow(!show); params.delete("new"); setParams(params, { replace: true }); }}>{show ? "Cancel" : "Request an appointment"}</Button>
      </div>
      {show && <NewAppointment onDone={() => { setShow(false); reload(); }} />}
      {err && <Alert tone="error" className="mt-4">{err}</Alert>}
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {data && data.length === 0 && !show && <p className="py-10 text-stone-600">No appointments yet.</p>}
      <div className="mt-5 space-y-3">
        {data?.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center gap-2"><Badge>{APPT_STATUS[a.status]}</Badge><span className="text-xs text-stone-500">{label(CONCERN_CATEGORIES, a.reason_category)} · requested {fmtDate(a.created_at)}</span></div>
            {a.scheduled_at && <p className="mt-2 font-display text-lg font-bold">{fmt(a.scheduled_at)}</p>}
            {a.staff_note && <p className="mt-1 text-sm"><span className="font-semibold">Note from the health centre:</span> {a.staff_note}</p>}
            {!a.scheduled_at && a.preferred_date && <p className="mt-1 text-sm text-stone-600">Preferred: {fmtDate(a.preferred_date)} ({label(WINDOWS, a.preferred_window).toLowerCase()})</p>}
            {["requested", "approved", "rescheduled"].includes(a.status) && <Button variant="outline" className="mt-3" onClick={() => cancel(a.id)}>Cancel</Button>}
          </Card>
        ))}
      </div>
    </div>
  );
}
