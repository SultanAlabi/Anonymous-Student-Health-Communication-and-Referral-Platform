import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE, errorMessage, publicApi } from "../api/client.js";
import { Alert, Badge, Spinner } from "../components/ui.jsx";
import { RESOURCE_CATEGORIES, fmtSize, label } from "../constants.js";

export default function ResourceDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setItem(null); setError("");
    publicApi.get(`/resources/${id}/`).then((r) => setItem(r.data))
      .catch((e) => setError(e.response?.status === 404 ? "This article isn’t available." : errorMessage(e)));
  }, [id]);

  return (
    <article className="mx-auto max-w-2xl">
      <Link to="/resources" className="text-sm font-semibold text-brand-700">← All health information</Link>
      {error && <Alert tone="error" className="mt-6">{error}</Alert>}
      {!item && !error && <Spinner />}
      {item && (
        <>
          <div className="mt-4"><Badge>{label(RESOURCE_CATEGORIES, item.category)}</Badge></div>
          <h1 className="mt-2 text-3xl font-bold">{item.title}</h1>
          <p className="mt-2 text-lg text-stone-600">{item.summary}</p>
          {/* Rendered as plain text on purpose: no HTML injection. */}
          <div className="mt-6 whitespace-pre-line leading-relaxed">{item.body}</div>
          {item.files?.length > 0 && (
            <section className="mt-8" aria-label="Downloads">
              <h2 className="text-lg font-bold">Downloads</h2>
              <ul className="mt-2 space-y-2">
                {item.files.map((f) => (
                  <li key={f.id}>
                    {/* Plain link: published files need no login. */}
                    <a href={`${API_BASE}/${f.path}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm hover:border-brand-500">
                      <span className="font-semibold text-brand-700">{f.name}</span><span className="shrink-0 text-xs text-stone-500">{fmtSize(f.size)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Alert tone="warn" className="mt-8">This information doesn’t replace advice from a healthcare professional. <Link className="underline" to="/anonymous">Ask a question anonymously</Link> or <Link className="underline" to="/emergency">find emergency help</Link>.</Alert>
        </>
      )}
    </article>
  );
}