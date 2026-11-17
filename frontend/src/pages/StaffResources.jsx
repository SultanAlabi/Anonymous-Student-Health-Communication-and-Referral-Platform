import { useState } from "react";
import { api, errorMessage, fieldErrors } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { RESOURCE_CATEGORIES, fmtDate, label } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAll, useAsync } from "../hooks.js";

const EMPTY = { title: "", category: "general", summary: "", body: "" };
const STATUS = { draft: "Draft", published: "Published", archived: "Archived" };

export default function StaffResources() {
  const { user } = useAuth();
  const admin = user.role === "admin";
  const [form, setForm] = useState(null);       // null = hidden; {id?, ...fields}
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const { data, error: loadErr, loading, reload } = useAsync(() => fetchAll("/resources/manage/"));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const edit = async (id) => {
    try { const { data: r } = await api.get(`/resources/${id}/`); setForm({ id, title: r.title, category: r.category, summary: r.summary, body: r.body }); setErrs({}); setError(""); }
    catch (e) { setError(errorMessage(e)); }
  };
  const save = async (e) => {
    e.preventDefault(); setErrs({}); setError("");
    const { id, ...body } = form;
    try { await (id ? api.patch(`/resources/${id}/`, body) : api.post("/resources/", body)); setForm(null); reload(); }
    catch (err) { const fe = fieldErrors(err); setErrs(fe); setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err)); }
  };
  const setStatus = async (id, status) => { try { await api.patch(`/resources/${id}/`, { status }); reload(); } catch (e) { setError(errorMessage(e)); } };
  const archive = async (id) => { if (!window.confirm("Archive this resource? It will disappear from the public site.")) return; try { await api.delete(`/resources/${id}/`); reload(); } catch (e) { setError(errorMessage(e)); } };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Health resources</h1>
        <Button onClick={() => { setForm(form ? null : EMPTY); setErrs({}); setError(""); }}>{form ? "Cancel" : "New resource"}</Button>
      </div>
      <p className="mt-1 text-stone-600">{admin ? "Review drafts, then publish. Published articles are public." : "Your articles are saved as drafts. An administrator reviews and publishes them."}</p>
      {form && (
        <Card className="mt-5">
          <form onSubmit={save} noValidate>
            <Field label="Title" maxLength={200} required value={form.title} onChange={set("title")} error={errs.title} />
            <Field as="select" label="Category" value={form.category} onChange={set("category")} error={errs.category}>{RESOURCE_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
            <Field label="Short summary" maxLength={300} required value={form.summary} onChange={set("summary")} error={errs.summary} />
            <Field as="textarea" rows={10} label="Article text (plain text; blank lines separate paragraphs)" required value={form.body} onChange={set("body")} error={errs.body} />
            {error && <Alert tone="error" className="mt-3">{error}</Alert>}
            <Button type="submit" className="mt-4">{form.id ? "Save changes" : "Save as draft"}</Button>
          </form>
        </Card>
      )}
      {!form && error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {loading && <Spinner />}
      {loadErr && <Alert tone="error" className="mt-4">{loadErr}</Alert>}
      {data?.length === 0 && <p className="py-10 text-stone-600">No resources yet.</p>}
      <div className="mt-5 space-y-3">
        {data?.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2"><Badge>{STATUS[r.status]}</Badge><span className="text-xs text-stone-500">{label(RESOURCE_CATEGORIES, r.category)}{r.published_at ? ` · published ${fmtDate(r.published_at)}` : ""}</span></div>
              <h3 className="mt-1 font-bold">{r.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(admin || r.status === "draft") && r.status !== "archived" && <Button variant="outline" onClick={() => edit(r.id)}>Edit</Button>}
              {admin && r.status !== "published" && <Button onClick={() => setStatus(r.id, "published")}>Publish</Button>}
              {admin && r.status === "published" && <Button variant="outline" onClick={() => setStatus(r.id, "draft")}>Unpublish</Button>}
              {admin && r.status !== "archived" && <Button variant="outline" onClick={() => archive(r.id)}>Archive</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
