import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { errorMessage } from "../api/client.js";
import { Alert, Button, Field } from "../components/ui.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await login(email.trim(), password);
      nav(loc.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? "Incorrect email or password." : errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-stone-600">For confidential messages, referrals and appointments. You don’t need an account to submit an <Link className="font-semibold text-brand-700 underline" to="/anonymous">anonymous concern</Link>.</p>
      {loc.state?.registered && <Alert tone="ok" className="mt-4">Account created. You can log in now.</Alert>}
      <form onSubmit={submit}>
        <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        <Button type="submit" className="mt-5 w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
      </form>
      <p className="mt-4 text-sm">New student? <Link className="font-semibold text-brand-700 underline" to="/register">Create an account</Link></p>
    </div>
  );
}
