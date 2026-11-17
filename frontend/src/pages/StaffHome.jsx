import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { Alert, Card, Spinner } from "../components/ui.jsx";
import { ROLE_LABEL } from "../constants.js";
import { useAsync } from "../hooks.js";

const count = (p) => api.get(p).then((r) => r.data.count);
const LOADERS = {
  ambassador: async () => ({ tiles: [["Referrals waiting in the pool", await count("/referrals/pool/"), "/staff/referrals"], ["Assigned to you", await count("/referrals/assigned/"), "/staff/referrals"]] }),
  professional: async () => ({ tiles: [
    ["Anonymous cases waiting", await count("/anonymous-concerns/queue/"), "/staff/anonymous"], ["Confidential concerns waiting", await count("/concerns/queue/"), "/staff/concerns"],
    ["Appointment requests", await count("/appointments/queue/"), "/staff/appointments"], ["Referrals assigned to you", await count("/referrals/assigned/"), "/staff/referrals"]] }),
  admin: async () => ({ stats: (await api.get("/admin/dashboard/")).data }),
};
const pretty = (k) => k.replace(/_/g, " ");

export default function StaffHome({ user }) {
  const { data, error, loading } = useAsync(LOADERS[user.role]);
  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {user.first_name}</h1>
      <p className="mt-1 text-stone-600">Signed in as {ROLE_LABEL[user.role]}.</p>
      {user.role === "admin" && <Alert className="mt-4">Counts only. Administrators don’t see the content of private cases or messages.</Alert>}
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {data?.tiles && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.tiles.map(([t, n, to]) => <Link key={t} to={to}><Card className="transition hover:border-brand-500"><p className="text-sm text-stone-600">{t}</p><p className="font-display text-3xl font-bold">{n}</p></Card></Link>)}
        </div>
      )}
      {data?.stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.stats).map(([group, v]) => {
            const flat = group === "users" ? { ...v.by_role, inactive: v.inactive } : v;
            return (
              <Card key={group}>
                <h2 className="font-bold capitalize">{pretty(group)}</h2>
                {Object.keys(flat).length === 0 ? <p className="mt-2 text-sm text-stone-500">None yet</p> : (
                  <dl className="mt-2 space-y-1 text-sm">{Object.entries(flat).map(([k, n]) => <div key={k} className="flex justify-between"><dt className="capitalize text-stone-600">{pretty(k)}</dt><dd className="font-semibold">{n}</dd></div>)}</dl>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
