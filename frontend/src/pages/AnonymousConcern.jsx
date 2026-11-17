import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, fieldErrors, publicApi } from "../api/client.js";
import { Alert, Button, Card, Field, LinkButton } from "../components/ui.jsx";
import { CONCERN_CATEGORIES } from "../constants.js";

const EMPTY = { category: "general", subject: "", description: "" };

export default function AnonymousConcern() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errs, setErrs] = useState({});
  const [code, setCode] = useState(null);   // kept in memory only: never stored, never put in a URL
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code || saved) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [code, saved]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setErrs({});
    try {
      const { data } = await publicApi.post("/anonymous-concerns/", form);
      setCode(data.reference_code);
      setForm(EMPTY);
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(Object.keys(fieldErrors(err)).length ? "Please fix the highlighted fields." : errorMessage(err));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* user can select manually */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`Your SafeSpace reference code:\n${code}\n\nKeep this private. It is the only way to read responses.\n`], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "safespace-reference-code.txt" });
    a.click(); URL.revokeObjectURL(url);
  };

  if (code) {
    return (
      <Card className="mx-auto max-w-xl border-brand-500 bg-brand-50 p-6">
        <h1 className="text-2xl font-bold">Your concern has been submitted</h1>
        <p className="mt-2 text-sm">Save this reference code now. It’s the only way to read your response, and <strong>we can’t recover it for you</strong>.</p>
        <p className="my-5 break-all rounded-xl border-2 border-dashed border-brand-600 bg-white p-4 text-center font-mono text-2xl font-bold tracking-wider" data-testid="code">{code}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy}>{copied ? "Copied" : "Copy code"}</Button>
          <Button variant="outline" onClick={download}>Download as text file</Button>
        </div>
        <label className="mt-5 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I’ve saved my code somewhere safe.</label>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton to="/portal" variant="outline">Go to the response portal</LinkButton>
          {saved && <Button variant="outline" onClick={() => { setCode(null); setCopied(false); setSaved(false); }}>Submit another</Button>}
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Submit an anonymous concern</h1>
      <p className="mt-2 text-stone-600">We don’t ask who you are and we don’t link this to any account, even if you’re logged in. Please don’t include your name or contact details in the text.</p>
      <Alert tone="error" className="mt-4">Is this an emergency? <Link to="/emergency" className="underline">Get help now</Link>. Don’t wait for a reply.</Alert>
      <form onSubmit={submit} noValidate>
        <Field as="select" label="Category" value={form.category} onChange={set("category")} error={errs.category}>
          {CONCERN_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Field>
        <Field label="Subject" maxLength={120} required value={form.subject} onChange={set("subject")} error={errs.subject} />
        <Field as="textarea" rows={6} label="Describe your concern" required minLength={10} maxLength={5000} value={form.description} onChange={set("description")} error={errs.description} />
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        <Button type="submit" className="mt-5" disabled={busy}>{busy ? "Submitting…" : "Submit anonymously"}</Button>
      </form>
    </div>
  );
}
