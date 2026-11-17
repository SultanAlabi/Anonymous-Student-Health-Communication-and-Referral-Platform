import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, LinkButton, cx } from "./ui.jsx";

const NAV = [["/", "Home"], ["/resources", "Health information"], ["/anonymous", "Anonymous concern"], ["/portal", "Check a response"]];

export default function Layout() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const load = () => api.get("/notifications/unread/").then((r) => setUnread(r.data.count)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    window.addEventListener("notifications:refresh", load);
    return () => { clearInterval(t); window.removeEventListener("notifications:refresh", load); };
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-sand/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="inline-block h-7 w-7 rounded-full bg-brand-600" aria-hidden /> SafeSpace
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1" aria-label="Main">
            {NAV.map(([to, text]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cx("rounded-full px-3 py-1.5 text-sm font-medium", isActive ? "bg-brand-100 text-ink" : "text-stone-600 hover:bg-brand-50")}>{text}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LinkButton to="/emergency" variant="danger">Emergency help</LinkButton>
            {user ? (
              <>
                <Link to="/notifications" aria-label={`Notifications, ${unread} unread`} className="relative rounded-full border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-semibold hover:bg-brand-50">
                  Alerts{unread > 0 && <span className="ml-1.5 rounded-full bg-red-700 px-1.5 py-0.5 text-xs text-white">{unread}</span>}
                </Link>
                <LinkButton to="/dashboard" variant="outline">My account</LinkButton>
                <Button variant="outline" onClick={logout}>Log out</Button>
              </>
            ) : (
              <LinkButton to="/login" variant="outline">Log in</LinkButton>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8"><Outlet /></main>
      <footer className="border-t border-stone-200 px-5 py-6 text-center text-xs text-stone-500">
        SafeSpace is a communication, information and referral platform. It does not diagnose or treat, and it is not a replacement for emergency medical services.
      </footer>
    </div>
  );
}
