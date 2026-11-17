import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { cx } from "./ui.jsx";

const TABS = {
  ambassador: [["/dashboard", "Overview"], ["/staff/referrals", "Referrals"]],
  professional: [["/dashboard", "Overview"], ["/staff/anonymous", "Anonymous cases"], ["/staff/concerns", "Confidential cases"], ["/staff/referrals", "Referrals"], ["/staff/appointments", "Appointments"], ["/staff/resources", "Resources"]],
  admin: [["/dashboard", "Overview"], ["/staff/users", "Users"], ["/staff/referral-monitor", "Referrals"], ["/staff/resources", "Resources"], ["/staff/emergency", "Emergency contacts"], ["/staff/audit", "Audit log"]],
};

export default function StaffArea({ children }) {
  const { user } = useAuth();
  return (
    <div>
      <nav aria-label="Workspace" className="mb-6 flex flex-wrap gap-1 border-b border-stone-200 pb-3">
        {(TABS[user.role] || []).map(([to, text]) => (
          <NavLink key={to} to={to} end={to === "/dashboard"} className={({ isActive }) => cx("rounded-full px-3.5 py-1.5 text-sm font-medium", isActive ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-brand-50")}>{text}</NavLink>
        ))}
      </nav>
      {children ?? <Outlet />}
    </div>
  );
}
