import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage, fieldErrors } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { CONCERN_CATEGORIES, CONCERN_STATUS, fmtDate, label } from "../constants.js";
import { fetchAll, useAsync } from "../hooks.js";

function NewConcern({ onDone }) {
  const [f, setF] = useState({ category: "general", subject: "", description: "" });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setErrs({});
    try { await api.post("/concerns/", f); onDone(); }
    catch (err) { const fe = fieldErrors(err); setErrs(fe); setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <Card className="mt-5">
      <h2 className="text-lg font-bold">New concern or question</h2>
      <p className="text-sm text-stone-600">This is linked to your account and visible only to the professional who picks it up.</p>
      <form onSubmit={submit} noValidate>
        <Field as="select" label="Category" value={f.category} onChange={set("category")} error={errs.category}>{CONCERN_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
        <Field label="Subject" maxLength={120} required value={f.subject} onChange={set("subject")} error={errs.subject} />
        <Field as="textarea" rows={5} label="Details" required minLength={10} maxLength={5000} value={f.description} onChange={set("description")} error={errs.description} />
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
        <Button type="submit" className="mt-4" disabled={busy}>{busy ? "Sending…" : "Send"}</Button>
      </form>
    </Card>
  );
}

export default function Concerns() {
  const [params, setParams] = useSearchParams();
  const [show, setShow] = useState(params.get("new") === "1");
  const { data, error, loading, reload } = useAsync(() => fetchAll("/concerns/my/"));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Concerns & questions</h1>
        <Button onClick={() => { setShow(!show); params.delete("new"); setParams(params, { replace: true }); }}>{show ? "Cancel" : "New concern"}</Button>
      </div>
      {show && <NewConcern onDone={() => { setShow(false); reload(); }} />}
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {data && data.length === 0 && !show && <p className="py-10 text-stone-600">Nothing here yet. Start with “New concern”.</p>}
      <div className="mt-5 space-y-3">
        {data?.map((c) => (
          <Link key={c.id} to={`/concerns/${c.id}`} className="block">
            <Card className="transition hover:border-brand-500">
              <div className="flex flex-wrap items-center gap-2"><Badge>{CONCERN_STATUS[c.status]}</Badge><span className="text-xs text-stone-500">{label(CONCERN_CATEGORIES, c.category)} · {fmtDate(c.created_at)}</span></div>
              <h3 className="mt-1 font-bold">{c.subject}</h3>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
