import { useState } from "react";
import { errorMessage, publicApi } from "../api/client.js";
import { Alert, Badge, Button, Card, Field } from "../components/ui.jsx";
import { CASE_STATUS } from "../constants.js";

export default function ResponsePortal() {
  const [code, setCode] = useState("");        // state only: codes never go in the URL or storage
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");

  const lookup = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setItem(null);
    try {
      const { data } = await publicApi.post("/anonymous-concerns/access/", { reference_code: code.trim() });
      setItem(data);
    } catch (err) {
      setError(err.response?.status === 404 ? "We couldn’t find that code. Check it and try again." : errorMessage(err));
    } finally { setBusy(false); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    setReplyError("");
    try {
      const { data } = await publicApi.post("/anonymous-concerns/follow-up/", { reference_code: code.trim(), body: reply });
      setItem(data); setReply("");
    } catch (err) { setReplyError(errorMessage(err)); }
  };

  const leave = () => { setItem(null); setCode(""); setReply(""); };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Check your response</h1>
      <p className="mt-2 text-stone-600">Enter the reference code you saved when you submitted your concern.</p>
      {!item && (
        <form onSubmit={lookup}>
          <Field label="Reference code" placeholder="ASCH-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} required value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
          {error && <Alert tone="error" className="mt-4">{error}</Alert>}
          <Button type="submit" className="mt-5" disabled={busy || !code.trim()}>{busy ? "Checking…" : "View response"}</Button>
        </form>
      )}
      {item && (
        <Card className="mt-6">
          <div className="flex items-center justify-between gap-2">
            <Badge>{CASE_STATUS[item.status] || item.status}</Badge>
            <button onClick={leave} className="text-sm font-semibold text-brand-700 underline">Close and clear</button>
          </div>
          <h2 className="mt-3 text-xl font-bold">{item.subject}</h2>
          <div className="mt-4 space-y-3">
            <div className="whitespace-pre-line rounded-xl bg-stone-100 p-3 text-sm"><p className="mb-1 text-xs font-semibold text-stone-500">Your concern</p>{item.description}</div>
            {item.messages.map((m, i) => (
              <div key={i} className={`whitespace-pre-line rounded-xl p-3 text-sm ${m.sender === "professional" ? "bg-brand-50" : "bg-stone-100"}`}>
                <p className="mb-1 text-xs font-semibold text-stone-500">{m.sender === "professional" ? "Healthcare professional" : "You"} · {new Date(m.created_at).toLocaleString()}</p>
                {m.body}
              </div>
            ))}
          </div>
          {item.status !== "responded" && <p className="mt-4 text-sm text-stone-600">Still waiting for a response? Check back later with the same code.</p>}
          {item.status !== "closed" && (
            <form onSubmit={sendReply} className="mt-5 border-t border-stone-200 pt-4">
              <Field as="textarea" rows={3} label="Add a follow-up message" maxLength={5000} required value={reply} onChange={(e) => setReply(e.target.value)} />
              {replyError && <Alert tone="error" className="mt-3">{replyError}</Alert>}
              <Button type="submit" className="mt-3" disabled={!reply.trim()}>Send follow-up</Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
