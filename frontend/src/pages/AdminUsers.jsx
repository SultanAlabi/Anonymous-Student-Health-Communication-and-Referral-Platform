import { useState } from "react";
import { api, errorMessage, fieldErrors } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { ROLE_LABEL, STAFF_ROLES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAll, useAsync } from "../hooks.js";

const EMPTY = { email: "", password: "", first_name: "", last_name: "", role: "ambassador" };

function NewUser({ onDone }) {
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(""); setErrs({});
    try { await api.post("/admin/users/", f); onDone(); }
    catch (err) { const fe = fieldErrors(err); setErrs(fe); setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err)); }
  };
  return (
    <Card className="mt-5">
      <h2 className="text-lg font-bold">Create a staff account</h2>
      <p className="text-sm text-stone-600">Share the temporary password through a secure channel and ask them to change it. Students register themselves.</p>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="First name" required value={f.first_name} onChange={set("first_name")} error={errs.first_name} />
          <Field label="Last name" required value={f.last_name} onChange={set("last_name")} error={errs.last_name} />
          <Field label="Email" type="email" required value={f.email} onChange={set("email")} error={errs.email} />
          <Field label="Temporary password (10+ characters)" type="password" autoComplete="new-password" required value={f.password} onChange={set("password")} error={errs.password} />
        </div>
        <Field as="select" label="Role" value={f.role} onChange={set("role")} error={errs.role}>{STAFF_ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
        <Button type="submit" className="mt-4">Create account</Button>
      </form>
    </Card>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [role, setRole] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const { data, error, loading, reload } = useAsync(() => fetchAll("/admin/users/", { role: role || undefined }), [role]);

  const patch = async (u, body) => {
    setErr("");
    try { await api.patch(`/admin/users/${u.id}/`, body); reload(); } catch (e) { setErr(errorMessage(e)); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Users</h1>
        <Button onClick={() => setShow(!show)}>{show ? "Cancel" : "New staff account"}</Button>
      </div>
      {show && <NewUser onDone={() => { setShow(false); reload(); }} />}
      <div className="mt-4 max-w-xs">
        <Field as="select" label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Field>
      </div>
      {err && <Alert tone="error" className="mt-4">{err}</Alert>}
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <div className="mt-5 space-y-3">
        {data?.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{u.first_name} {u.last_name} {!u.is_active && <span className="text-sm font-normal text-red-700">(deactivated)</span>}</h3>
              <p className="text-sm text-stone-600">{u.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{ROLE_LABEL[u.role]}</Badge>
              <select aria-label={`Role for ${u.email}`} value={u.role} disabled={u.id === me.id} onChange={(e) => patch(u, { role: e.target.value })} className="rounded-xl border border-stone-300 bg-white px-2 py-1.5 text-sm">
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Button variant="outline" disabled={u.id === me.id} onClick={() => patch(u, { is_active: !u.is_active })}>{u.is_active ? "Deactivate" : "Reactivate"}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
