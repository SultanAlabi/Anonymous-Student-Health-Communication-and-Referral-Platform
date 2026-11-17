import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Spinner } from "./ui.jsx";

// UI convenience only: the backend enforces every permission.
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
