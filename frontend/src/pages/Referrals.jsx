import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage, fieldErrors } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { REFERRAL_STATUS, SERVICES, URGENCY, fmtDate, label } from "../constants.js";
import { fetchAll, useAsync } from "../hooks.js";

function NewReferral({ onDone }) {
  const [f, setF] = useState({ service_type: "counselling", urgency: "routine", note: "" });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setErrs({});
    try { const { data } = await api.post("/referrals/", f); onDone(data.emergency_notice); }
    catch (err) { const fe = fieldErrors(err); setErrs(fe); setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <Card className="mt-5">
      <h2 className="text-lg font-bold">Request a referral</h2>
      <p className="text-sm text-stone-600">A student health ambassador will help connect you to the right service. They see only the service you choose, your first name and the note below, so share only what you’re comfortable with.</p>
      <form onSubmit={submit} noValidate>
        <Field as="select" label="Service needed" value={f.service_type} onChange={set("service_type")} error={errs.service_type}>{SERVICES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
        <Field as="select" label="How soon?" value={f.urgency} onChange={set("urgency")} error={errs.urgency}>{URGENCY.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
        <Field as="textarea" rows={3} label="Note for your ambassador (optional)" maxLength={500} value={f.note} onChange={set("note")} error={errs.note} />
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
        <Button type="submit" className="mt-4" disabled={busy}>{busy ? "Sending…" : "Request referral"}</Button>
      </form>
    </Card>
  );
}

export default function Referrals() {
  const [params, setParams] = useSearchParams();
  const [show, setShow] = useState(params.get("new") === "1");
  const [notice, setNotice] = useState("");
  const { data, error, loading, reload } = useAsync(() => fetchAll("/referrals/my/"));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Referrals</h1>
        <Button onClick={() => { setShow(!show); params.delete("new"); setParams(params, { replace: true }); }}>{show ? "Cancel" : "Request a referral"}</Button>
      </div>
      {notice && <Alert tone="error" className="mt-4">{notice} <Link to="/emergency" className="underline">Emergency contacts</Link></Alert>}
      {show && <NewReferral onDone={(n) => { setNotice(n || ""); setShow(false); reload(); }} />}
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {data && data.length === 0 && !show && <p className="py-10 text-stone-600">No referrals yet.</p>}
      <div className="mt-5 space-y-3">
        {data?.map((r) => (
          <Link key={r.id} to={`/referrals/${r.id}`} className="block">
            <Card className="transition hover:border-brand-500">
              <div className="flex flex-wrap items-center gap-2"><Badge>{REFERRAL_STATUS[r.status]}</Badge><span className="text-xs text-stone-500">{fmtDate(r.created_at)} · {label(URGENCY, r.urgency)}</span></div>
              <h3 className="mt-1 font-bold">{label(SERVICES, r.service_type)}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
