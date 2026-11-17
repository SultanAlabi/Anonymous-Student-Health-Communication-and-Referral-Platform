import { Link } from "react-router-dom";
import { Alert, Badge, Card, Spinner } from "../components/ui.jsx";
import { CONCERN_STATUS, fmt } from "../constants.js";
import { fetchAll, useAsync } from "../hooks.js";

export default function Inbox() {
  const { data, error, loading } = useAsync(() => fetchAll("/messages/conversations/"));
  return (
    <div>
      <h1 className="text-3xl font-bold">Messages</h1>
      <p className="mt-1 text-stone-600">Conversations with healthcare professionals. Replies arrive when they’re ready. This isn’t live chat.</p>
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {data && data.length === 0 && <p className="py-10 text-stone-600">No conversations yet. They start once a professional picks up one of your concerns.</p>}
      <div className="mt-5 space-y-3">
        {data?.map((c) => (
          <Link key={c.id} to={`/concerns/${c.id}`} className="block">
            <Card className="flex items-center justify-between gap-3 transition hover:border-brand-500">
              <div><h3 className="font-bold">{c.subject}</h3><p className="text-xs text-stone-500">{CONCERN_STATUS[c.status]} · last message {fmt(c.last_message_at)}</p></div>
              {c.unread > 0 && <Badge>{c.unread} new</Badge>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
