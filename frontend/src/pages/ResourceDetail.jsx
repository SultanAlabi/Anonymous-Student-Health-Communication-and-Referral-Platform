import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { errorMessage, publicApi } from "../api/client.js";
import { Alert, Badge, Spinner } from "../components/ui.jsx";
import { RESOURCE_CATEGORIES, label } from "../constants.js";

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
          <Alert tone="warn" className="mt-8">This information doesn’t replace advice from a healthcare professional. <Link className="underline" to="/anonymous">Ask a question anonymously</Link> or <Link className="underline" to="/emergency">find emergency help</Link>.</Alert>
        </>
      )}
    </article>
  );
}
