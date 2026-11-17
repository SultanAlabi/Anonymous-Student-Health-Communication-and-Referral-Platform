import { NavLink, Outlet } from "react-router-dom";
import { cx } from "./ui.jsx";

const TABS = [["/dashboard", "Overview"], ["/concerns", "Concerns & questions"], ["/messages", "Messages"], ["/referrals", "Referrals"], ["/appointments", "Appointments"]];

export default function StudentArea({ children }) {
  return (
    <div>
      <nav aria-label="Student area" className="mb-6 flex flex-wrap gap-1 border-b border-stone-200 pb-3">
        {TABS.map(([to, text]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => cx("rounded-full px-3.5 py-1.5 text-sm font-medium", isActive ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-brand-50")}>{text}</NavLink>
        ))}
      </nav>
      {children ?? <Outlet />}
    </div>
  );
}
