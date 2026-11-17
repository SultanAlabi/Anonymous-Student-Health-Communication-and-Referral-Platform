import { useState } from "react";
import { api, errorMessage, fieldErrors } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { EMERGENCY_CATEGORIES, label } from "../constants.js";
import { fetchAll, useAsync } from "../hooks.js";

const EMPTY = { name: "", category: "health_centre", phone: "", address: "", description: "", hours: "", display_order: 100, is_active: true };

export default function AdminEmergency() {
  const [form, setForm] = useState(null);
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const { data, error: loadErr, loading, reload } = useAsync(() => fetchAll("/admin/emergency-contacts/"));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault(); setErrs({}); setError("");
    const { id, ...body } = form;
    body.display_order = Number(body.display_order) || 100;
    try { await (id ? api.patch(`/admin/emergency-contacts/${id}/`, body) : api.post("/admin/emergency-contacts/", body)); setForm(null); reload(); }
    catch (err) { const fe = fieldErrors(err); setErrs(fe); setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err)); }
  };
  const run = async (fn) => { setError(""); try { await fn(); reload(); } catch (e) { setError(errorMessage(e)); } };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Emergency contacts</h1>
        <Button onClick={() => { setForm(form ? null : EMPTY); setErrs({}); setError(""); }}>{form ? "Cancel" : "New contact"}</Button>
      </div>
      <Alert tone="warn" className="mt-4">Nothing is shown to students until a contact is <strong>verified</strong> against the university’s official information. Changing a name, category, phone, address or hours removes verification until you verify it again.</Alert>
      {form && (
        <Card className="mt-5">
          <form onSubmit={save} noValidate>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Field label="Name" required value={form.name} onChange={set("name")} error={errs.name} />
              <Field label="Phone" required value={form.phone} onChange={set("phone")} error={errs.phone} />
              <Field as="select" label="Category" value={form.category} onChange={set("category")} error={errs.category}>{EMERGENCY_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
              <Field label="Hours (e.g. 24/7)" value={form.hours} onChange={set("hours")} error={errs.hours} />
              <Field label="Address / directions" value={form.address} onChange={set("address")} error={errs.address} />
              <Field label="Display order (lower shows first)" type="number" value={form.display_order} onChange={set("display_order")} error={errs.display_order} />
            </div>
            <Field label="Short description" maxLength={300} value={form.description} onChange={set("description")} error={errs.description} />
            {form.id && <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>}
            {error && <Alert tone="error" className="mt-3">{error}</Alert>}
            <Button type="submit" className="mt-4">{form.id ? "Save changes" : "Create (unverified)"}</Button>
          </form>
        </Card>
      )}
      {!form && error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {loading && <Spinner />}
      {loadErr && <Alert tone="error" className="mt-4">{loadErr}</Alert>}
      {data?.length === 0 && <p className="py-10 text-stone-600">No contacts yet. Add the contacts the university has confirmed.</p>}
      <div className="mt-5 space-y-3">
        {data?.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {!c.is_active ? <Badge>Inactive</Badge> : c.is_verified ? <Badge>Live: verified</Badge> : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Hidden: awaiting verification</span>}
                <span className="text-xs text-stone-500">{label(EMERGENCY_CATEGORIES, c.category)}</span>
              </div>
              <h3 className="mt-1 font-bold">{c.name} · {c.phone}</h3>
              {c.address && <p className="text-sm text-stone-600">{c.address}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.is_active && !c.is_verified && <Button onClick={() => run(() => api.post(`/admin/emergency-contacts/${c.id}/verify/`))}>Verify</Button>}
              <Button variant="outline" onClick={() => { setForm({ ...EMPTY, ...c }); setErrs({}); setError(""); }}>Edit</Button>
              {c.is_active && <Button variant="outline" onClick={() => window.confirm("Deactivate this contact?") && run(() => api.delete(`/admin/emergency-contacts/${c.id}/`))}>Deactivate</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
