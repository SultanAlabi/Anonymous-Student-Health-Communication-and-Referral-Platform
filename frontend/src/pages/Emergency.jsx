import { useEffect, useState } from "react";
import { publicApi } from "../api/client.js";
import { Alert, Card, Spinner } from "../components/ui.jsx";

export default function Emergency() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    publicApi.get("/emergency-contacts/").then((r) => setData(r.data)).catch(() => setFailed(true));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">Emergency help</h1>
      {/* Static on purpose: shown immediately, even if the API is slow or down. */}
      <div role="alert" className="mt-4 rounded-2xl bg-red-700 p-5 text-white">
        <p className="text-lg font-semibold">If you or someone else is in immediate danger or needs urgent medical care, call the national emergency number now.</p>
        <a href="tel:112" className="mt-3 inline-block rounded-full bg-white px-6 py-2.5 text-xl font-bold text-red-700">Call 112</a>
        <p className="mt-3 text-sm">Don’t wait for a reply from this platform. You don’t need to log in.</p>
      </div>

      <h2 className="mt-8 text-xl font-bold">Campus and local contacts</h2>
      {!data && !failed && <Spinner />}
      {failed && <Alert tone="warn" className="mt-3">We couldn’t load the campus contacts right now. Please call 112, or go straight to the nearest hospital or the university health centre.</Alert>}
      {data && data.contacts.length === 0 && <Alert className="mt-3">Verified campus contacts will appear here once the university has confirmed them. For now, call 112 or go to the nearest hospital.</Alert>}
      {data && data.contacts.length > 0 && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {data.contacts.map((c) => (
            <Card key={c.id}>
              <h3 className="font-bold">{c.name}</h3>
              <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`} className="mt-1 block text-2xl font-bold text-brand-700">{c.phone}</a>
              {c.hours && <p className="mt-1 text-sm text-stone-600">Hours: {c.hours}</p>}
              {c.address && <p className="text-sm text-stone-600">{c.address}</p>}
              {c.description && <p className="mt-2 text-sm">{c.description}</p>}
            </Card>
          ))}
        </div>
      )}
      {data && <p className="mt-6 text-sm text-stone-600">{data.disclaimer}</p>}
    </div>
  );
}
