import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { Alert, Card, LinkButton, Spinner } from "../components/ui.jsx";
import { useAsync } from "../hooks.js";

const load = async () => {
  const get = (p) => api.get(p).then((r) => r.data.count);
  const [concerns, referrals, appointments, unread] = await Promise.all(["/concerns/my/", "/referrals/my/", "/appointments/my/", "/notifications/unread/"].map(get));
  return { concerns, referrals, appointments, unread };
};

export default function StudentHome({ user }) {
  const { data, error, loading } = useAsync(load);
  const tiles = data && [["Concerns & questions", data.concerns, "/concerns"], ["Referrals", data.referrals, "/referrals"], ["Appointments", data.appointments, "/appointments"]];
  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {user.first_name}</h1>
      <p className="mt-1 text-stone-600">Your private space. Only you and the professionals helping you can see what’s here.</p>
      <Alert tone="warn" className="mt-4">In an emergency, don’t wait for a reply here. <Link to="/emergency" className="font-bold underline">Get emergency help</Link>.</Alert>
      {loading && <Spinner />}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      {data && (
        <>
          {data.unread > 0 && <Alert className="mt-4">You have {data.unread} unread notification{data.unread === 1 ? "" : "s"}. <Link to="/notifications" className="font-bold underline">View</Link></Alert>}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {tiles.map(([t, n, to]) => (
              <Link key={t} to={to}><Card className="transition hover:border-brand-500"><p className="text-sm text-stone-600">{t}</p><p className="font-display text-3xl font-bold">{n}</p></Card></Link>
            ))}
          </div>
        </>
      )}
      <h2 className="mt-8 text-xl font-bold">What would you like to do?</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <LinkButton to="/concerns?new=1">Ask a question or share a concern</LinkButton>
        <LinkButton to="/referrals?new=1" variant="outline">Request a referral</LinkButton>
        <LinkButton to="/appointments?new=1" variant="outline">Request an appointment</LinkButton>
        <LinkButton to="/anonymous" variant="outline">Submit anonymously instead</LinkButton>
      </div>
    </div>
  );
}
