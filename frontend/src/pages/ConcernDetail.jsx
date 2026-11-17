import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";
import Thread from "../components/Thread.jsx";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { CONCERN_CATEGORIES, CONCERN_STATUS, fmt, label } from "../constants.js";
import { fetchAll, refreshBell, useAsync } from "../hooks.js";

export default function ConcernDetail() {
  const { id } = useParams();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(null);
  const [err, setErr] = useState("");

  const { data, error, loading, reload } = useAsync(async () => {
    const [{ data: concern }, messages] = await Promise.all([api.get(`/concerns/${id}/`), fetchAll("/messages/", { concern: id })]);
    const unread = messages.filter((m) => !m.is_mine && !m.read_at);
    if (unread.length) Promise.allSettled(unread.map((m) => api.patch(`/messages/${m.id}/read/`))).then(refreshBell);
    return { concern, messages };
  }, [id]);

  if (loading && !data) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const { concern: c, messages } = data;
  const closed = c.status === "closed";

  const save = async (e) => {
    e.preventDefault(); setErr("");
    try { await api.patch(`/concerns/${id}/`, f); setEditing(false); reload(); } catch (x) { setErr(errorMessage(x)); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/concerns" className="text-sm font-semibold text-brand-700">← All concerns</Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2"><Badge>{CONCERN_STATUS[c.status]}</Badge><span className="text-xs text-stone-500">{label(CONCERN_CATEGORIES, c.category)} · {fmt(c.created_at)}</span></div>
        {!editing ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">{c.subject}</h1>
            <p className="mt-2 whitespace-pre-line text-sm">{c.description}</p>
            {c.status === "open" && <Button variant="outline" className="mt-4" onClick={() => { setF({ category: c.category, subject: c.subject, description: c.description }); setEditing(true); }}>Edit</Button>}
          </>
        ) : (
          <form onSubmit={save}>
            <Field as="select" label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CONCERN_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
            <Field label="Subject" maxLength={120} required value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            <Field as="textarea" rows={5} label="Details" required minLength={10} maxLength={5000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            {err && <Alert tone="error" className="mt-3">{err}</Alert>}
            <div className="mt-4 flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
          </form>
        )}
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-bold">Conversation</h2>
      <Thread
        messages={messages}
        canSend={c.assigned && !closed}
        blockedReason={closed ? "This concern is closed." : "A healthcare professional hasn’t picked this up yet. You’ll get a notification when they do. You can still edit your details until then."}
        onSend={async (body) => { await api.post("/messages/", { concern: id, body }); refreshBell(); await reload(); }}
      />
    </div>
  );
}
