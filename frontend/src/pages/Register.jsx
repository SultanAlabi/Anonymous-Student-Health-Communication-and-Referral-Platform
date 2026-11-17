import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage, fieldErrors, publicApi } from "../api/client.js";
import { Alert, Button, Field } from "../components/ui.jsx";

const INITIAL = { first_name: "", last_name: "", email: "", student_number: "", department: "", level: "", password: "" };

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState(INITIAL);
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setErrs({});
    if (f.password.length < 10) return setErrs({ password: "Use at least 10 characters." });
    setBusy(true);
    try {
      await publicApi.post("/auth/register/", f);
      nav("/login", { state: { registered: true } });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrs(fe);
      setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Create a student account</h1>
      <p className="mt-2 text-stone-600">Accounts are for confidential support. Anonymous help never needs one.</p>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="First name" required value={f.first_name} onChange={set("first_name")} error={errs.first_name} />
          <Field label="Last name" required value={f.last_name} onChange={set("last_name")} error={errs.last_name} />
        </div>
        <Field label="Email" type="email" autoComplete="username" required value={f.email} onChange={set("email")} error={errs.email} />
        <Field label="Student number" required value={f.student_number} onChange={set("student_number")} error={errs.student_number} />
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Department" value={f.department} onChange={set("department")} error={errs.department} />
          <Field label="Level" value={f.level} onChange={set("level")} error={errs.level} />
        </div>
        <Field label="Password" type="password" autoComplete="new-password" required value={f.password} onChange={set("password")} error={errs.password} />
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        <Button type="submit" className="mt-5 w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-4 text-sm">Already registered? <Link className="font-semibold text-brand-700 underline" to="/login">Log in</Link></p>
    </div>
  );
}
