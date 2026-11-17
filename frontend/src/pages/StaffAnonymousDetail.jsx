import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import Thread from "../components/Thread.jsx";
import { Alert, Badge, Card, Spinner } from "../components/ui.jsx";
import { CONCERN_CATEGORIES, CONCERN_STATUS, fmt, label } from "../constants.js";
import { useAsync } from "../hooks.js";

export default function StaffAnonymousDetail() {
  const { id } = useParams();
  const { data: c, error, loading, reload } = useAsync(() => api.get(`/anonymous-concerns/${id}/`).then((r) => r.data), [id]);
  if (loading && !c) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const messages = [{ id: "first", is_mine: false, sender_role: "student", body: c.description, created_at: c.created_at },
    ...c.messages.map((m, i) => ({ id: i, is_mine: m.sender === "professional", sender_role: m.sender, body: m.body, created_at: m.created_at }))];
  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/staff/anonymous" className="text-sm font-semibold text-brand-700">← Anonymous cases</Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2"><Badge>{CONCERN_STATUS[c.status]}</Badge><span className="text-xs text-stone-500">{label(CONCERN_CATEGORIES, c.category)} · {fmt(c.created_at)}</span></div>
        <h1 className="mt-2 text-2xl font-bold">{c.subject}</h1>
        <p className="mt-2 text-xs text-stone-500">Anonymous student. Your reply is shown to them when they enter their reference code.</p>
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-bold">Conversation</h2>
      <Thread messages={messages} names={{ student: "Anonymous student" }} canSend={c.status !== "closed"} blockedReason="This case is closed."
        onSend={async (body) => { await api.post(`/anonymous-concerns/${id}/respond/`, { body }); await reload(); }} />
    </div>
  );
}
