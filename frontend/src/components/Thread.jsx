import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { fmt, ROLE_LABEL } from "../constants.js";
import { Alert, Button, Field, cx } from "./ui.jsx";

export default function Thread({ messages, onSend, canSend, blockedReason, names }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await onSend(body.trim()); setBody(""); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {messages.length === 0 && <p className="text-sm text-stone-500">No messages yet.</p>}
      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={cx("max-w-[85%] whitespace-pre-line rounded-2xl p-3 text-sm", m.is_mine ? "ml-auto bg-brand-100" : "bg-stone-100")}>
            <p className="mb-1 text-xs font-semibold text-stone-500">{m.is_mine ? "You" : names?.[m.sender_role] || ROLE_LABEL[m.sender_role] || m.sender_role} · {fmt(m.created_at)}</p>
            {m.body}
          </div>
        ))}
      </div>
      {canSend ? (
        <form onSubmit={send} className="mt-5 border-t border-stone-200 pt-4">
          <Field as="textarea" rows={3} label="Write a message" maxLength={5000} required value={body} onChange={(e) => setBody(e.target.value)} />
          {error && <Alert tone="error" className="mt-3">{error}</Alert>}
          <Button type="submit" className="mt-3" disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send"}</Button>
        </form>
      ) : blockedReason && <Alert className="mt-5">{blockedReason}</Alert>}
    </div>
  );
}
