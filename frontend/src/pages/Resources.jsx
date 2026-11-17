import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, publicApi } from "../api/client.js";
import { Alert, Badge, Button, Card, Spinner, cx } from "../components/ui.jsx";
import { RESOURCE_CATEGORIES, label } from "../constants.js";

export default function Resources() {
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null); setError("");
    publicApi.get("/resources/", { params: { category: category || undefined, q: applied || undefined, page } })
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, [category, applied, page]);

  const pick = (c) => { setCategory(c); setPage(1); };
  const chip = (active) => cx("rounded-full border px-3.5 py-1.5 text-sm font-medium", active ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white hover:bg-brand-50");

  return (
    <div>
      <h1 className="text-3xl font-bold">Health information</h1>
      <p className="mt-2 text-stone-600">Reviewed guidance for students. This is information, not a diagnosis.</p>
      <form className="mt-5 flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(q.trim()); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics" aria-label="Search topics" className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 ring-brand-200" />
        <Button type="submit">Search</Button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={chip(!category)} onClick={() => pick("")}>All</button>
        {RESOURCE_CATEGORIES.map(([k, v]) => <button key={k} className={chip(category === k)} onClick={() => pick(k)}>{v}</button>)}
      </div>
      {error && <Alert tone="error" className="mt-6">{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && (data.results.length === 0
        ? <p className="py-10 text-stone-600">Nothing found yet. Try another topic.</p>
        : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((r) => (
              <Link key={r.id} to={`/resources/${r.id}`}>
                <Card className="h-full transition hover:border-brand-500">
                  <Badge>{label(RESOURCE_CATEGORIES, r.category)}</Badge>
                  <h3 className="mt-2 text-lg font-bold">{r.title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{r.summary}</p>
                </Card>
              </Link>
            ))}
          </div>)}
      {data && (data.previous || data.next) && (
        <div className="mt-6 flex gap-2">
          <Button variant="outline" disabled={!data.previous} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="outline" disabled={!data.next} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
