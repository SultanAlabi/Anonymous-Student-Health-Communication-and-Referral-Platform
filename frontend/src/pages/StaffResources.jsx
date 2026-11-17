import { useState } from "react";
import { api, errorMessage, fieldErrors, saveBlob } from "../api/client.js";
import { Alert, Badge, Button, Card, Field, Spinner } from "../components/ui.jsx";
import { RESOURCE_CATEGORIES, fmtDate, fmtSize, label } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAll, useAsync } from "../hooks.js";

const EMPTY = { title: "", category: "general", summary: "", body: "" };
const STATUS = { draft: "Draft", published: "Published", archived: "Archived" };
const MAX_BYTES = 10 * 1024 * 1024;

export default function StaffResources() {
  const { user } = useAuth();
  const admin = user.role === "admin";
  const [form, setForm] = useState(null);       // null = hidden; {id?, ...fields}
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("draft"); // status of the resource being edited
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileErr, setFileErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const { data, error: loadErr, loading, reload } = useAsync(() => fetchAll("/resources/manage/"));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const canEditFiles = form?.id && (admin || status === "draft");

  const open = (f, fl = [], st = "draft") => { setForm(f); setFiles(fl); setStatus(st); setErrs({}); setError(""); setNotice(""); setFileErr(""); };
  const edit = async (id) => {
    try { const { data: r } = await api.get(`/resources/${id}/`); open({ id, title: r.title, category: r.category, summary: r.summary, body: r.body }, r.files, r.status); }
    catch (e) { setError(errorMessage(e)); }
  };
  const save = async (e) => {
    e.preventDefault(); setErrs({}); setError(""); setNotice("");
    const { id, ...body } = form;
    try {
      if (id) { await api.patch(`/resources/${id}/`, body); setForm(null); reload(); }
      else {
        const { data: r } = await api.post("/resources/", body);   // stay open so files can be attached
        setForm({ id: r.id, ...body }); setFiles([]); setStatus(r.status); setNotice("Draft saved. You can attach files below, then press “Save changes” if you edit anything else."); reload();
      }
    } catch (err) { const fe = fieldErrors(err); setErrs(fe); setError(Object.keys(fe).length ? "Please fix the highlighted fields." : errorMessage(err)); }
  };
  const upload = async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    setFileErr("");
    if (f.size > MAX_BYTES) return setFileErr("Files must be 10 MB or smaller.");
    const fd = new FormData(); fd.append("file", f);
    setUploading(true);
    try { const { data: nf } = await api.post(`/resources/${form.id}/files/`, fd); setFiles((p) => [...p, nf]); }
    catch (err) { setFileErr(errorMessage(err)); }
    finally { setUploading(false); }
  };
  const removeFile = async (fid) => {
    if (!window.confirm("Remove this file?")) return;
    try { await api.delete(`/resources/${form.id}/files/${fid}/`); setFiles((p) => p.filter((x) => x.id !== fid)); } catch (err) { setFileErr(errorMessage(err)); }
  };
  const download = async (f) => { try { await saveBlob(f.path, f.name); } catch (err) { setFileErr(errorMessage(err)); } };
  const setSt = async (id, st) => { try { await api.patch(`/resources/${id}/`, { status: st }); reload(); } catch (e) { setError(errorMessage(e)); } };
  const archive = async (id) => { if (!window.confirm("Archive this resource? It will disappear from the public site.")) return; try { await api.delete(`/resources/${id}/`); reload(); } catch (e) { setError(errorMessage(e)); } };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Health resources</h1>
        <Button onClick={() => (form ? setForm(null) : open(EMPTY))}>{form ? "Close editor" : "New resource"}</Button>
      </div>
      <p className="mt-1 text-stone-600">{admin ? "Review drafts, then publish. Published articles and their files are public." : "Your articles are saved as drafts. An administrator reviews and publishes them."}</p>
      {form && (
        <Card className="mt-5">
          <form onSubmit={save} noValidate>
            <Field label="Title" maxLength={200} required value={form.title} onChange={set("title")} error={errs.title} />
            <Field as="select" label="Category" value={form.category} onChange={set("category")} error={errs.category}>{RESOURCE_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Field>
            <Field label="Short summary" maxLength={300} required value={form.summary} onChange={set("summary")} error={errs.summary} />
            <Field as="textarea" rows={10} label="Article text (plain text; blank lines separate paragraphs)" required value={form.body} onChange={set("body")} error={errs.body} />
            {notice && <Alert tone="ok" className="mt-3">{notice}</Alert>}
            {error && <Alert tone="error" className="mt-3">{error}</Alert>}
            <Button type="submit" className="mt-4">{form.id ? "Save changes" : "Save as draft"}</Button>
          </form>

          <div className="mt-6 border-t border-stone-200 pt-5">
            <h2 className="text-lg font-bold">Attached files</h2>
            {!form.id && <p className="mt-1 text-sm text-stone-600">Save the draft first, then you can attach files (PDF, PNG, JPG or Word .docx, up to 10 MB each, 5 per resource).</p>}
            {form.id && (
              <>
                {files.length === 0 && <p className="mt-1 text-sm text-stone-500">No files attached.</p>}
                <ul className="mt-2 space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm">
                      <span><span className="font-semibold">{f.name}</span> <span className="text-xs text-stone-500">{fmtSize(f.size)}</span></span>
                      <span className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => download(f)}>Download</Button>
                        {canEditFiles && <Button variant="outline" type="button" onClick={() => removeFile(f.id)}>Remove</Button>}
                      </span>
                    </li>
                  ))}
                </ul>
                {canEditFiles
                  ? <div className="mt-3"><label className="mb-1.5 block text-sm font-semibold" htmlFor="up">Add a file</label>
                      <input id="up" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" disabled={uploading || files.length >= 5} onChange={upload} className="text-sm" />
                      {uploading && <p className="mt-1 text-sm text-stone-500">Uploading…</p>}</div>
                  : <p className="mt-2 text-sm text-stone-600">Files can only be changed while the resource is a draft.</p>}
                {fileErr && <Alert tone="error" className="mt-3">{fileErr}</Alert>}
              </>
            )}
          </div>
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
              {admin && r.status !== "published" && <Button onClick={() => setSt(r.id, "published")}>Publish</Button>}
              {admin && r.status === "published" && <Button variant="outline" onClick={() => setSt(r.id, "draft")}>Unpublish</Button>}
              {admin && r.status !== "archived" && <Button variant="outline" onClick={() => archive(r.id)}>Archive</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}