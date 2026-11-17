import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import Thread from "../components/Thread.jsx";
import { Alert, Badge, Card, Spinner } from "../components/ui.jsx";
import { CONCERN_CATEGORIES, CONCERN_STATUS, fmt, label } from "../constants.js";
import { fetchAll, refreshBell, useAsync } from "../hooks.js";

export default function StaffConcernDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useAsync(async () => {
    const [{ data: concern }, messages] = await Promise.all([api.get(`/concerns/${id}/`), fetchAll("/messages/", { concern: id })]);
    const unread = messages.filter((m) => !m.is_mine && !m.read_at);
    if (unread.length) Promise.allSettled(unread.map((m) => api.patch(`/messages/${m.id}/read/`))).then(refreshBell);
    return { concern, messages };
  }, [id]);
  if (loading && !data) return <Spinner />;
  if (error) return <Alert tone="error">{error}</Alert>;
  const { concern: c, messages } = data;
  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/staff/concerns" className="text-sm font-semibold text-brand-700">← Confidential cases</Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2"><Badge>{CONCERN_STATUS[c.status]}</Badge><span className="text-xs text-stone-500">{label(CONCERN_CATEGORIES, c.category)} · {fmt(c.created_at)}</span></div>
        <h1 className="mt-2 text-2xl font-bold">{c.subject}</h1>
        {c.student && <p className="mt-1 text-sm text-stone-600">{c.student.name}{c.student.student_number ? ` · ${c.student.student_number}` : ""}{c.student.department ? ` · ${c.student.department}` : ""}</p>}
        <p className="mt-3 whitespace-pre-line text-sm">{c.description}</p>
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-bold">Conversation</h2>
      <Thread messages={messages} canSend={c.status !== "closed"} blockedReason="This concern is closed."
        onSend={async (body) => { await api.post("/messages/", { concern: id, body }); await reload(); }} />
    </div>
  );
}
