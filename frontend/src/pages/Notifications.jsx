import { useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api/client.js";
import { Alert, Button, Spinner, cx } from "../components/ui.jsx";
import { fmt } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchAll, refreshBell, useAsync } from "../hooks.js";

const STUDENT = { concern: (id) => `/concerns/${id}`, referral: (id) => `/referrals/${id}`, appointment: () => "/appointments" };
const STAFF = { concern: (id) => `/staff/concerns/${id}`, referral: (id) => `/staff/referrals/${id}`, appointment: (id) => `/staff/appointments/${id}`, anonymous_case: (id) => `/staff/anonymous/${id}` };

export default function Notifications() {
  const nav = useNavigate();
  const { user } = useAuth();
  const ROUTES = user.role === "student" ? STUDENT : STAFF;
  const { data, error, loading, reload } = useAsync(() => fetchAll("/notifications/"));

  const open = async (n) => {
    if (!n.is_read) { try { await api.patch(`/notifications/${n.id}/read/`); refreshBell(); } catch { /* still navigate */ } }
    const to = ROUTES[n.target_type]?.(n.target_id);
    if (to) nav(to); else reload();
  };
  const readAll = async () => { try { await api.patch("/notifications/read-all/"); refreshBell(); reload(); } catch (e) { alert(errorMessage(e)); } };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {data?.some((n) => !n.is_read) && <Button variant="outline" onClick={readAll}>Mark all as read</Button>}
      </div>
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {data && data.length === 0 && <p className="py-10 text-stone-600">You’re all caught up.</p>}
      <ul className="mt-5 space-y-2">
        {data?.map((n) => (
          <li key={n.id}>
            <button onClick={() => open(n)} className={cx("flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left text-sm transition hover:border-brand-500", n.is_read ? "border-stone-200 bg-white" : "border-brand-200 bg-brand-50 font-semibold")}>
              <span>{n.title}</span><span className="shrink-0 text-xs font-normal text-stone-500">{fmt(n.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
