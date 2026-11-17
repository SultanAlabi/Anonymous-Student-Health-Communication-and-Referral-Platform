import { useAuth } from "../context/AuthContext.jsx";
import StaffArea from "../components/StaffArea.jsx";
import StudentArea from "../components/StudentArea.jsx";
import StaffHome from "./StaffHome.jsx";
import StudentHome from "./StudentHome.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === "student") return <StudentArea><StudentHome user={user} /></StudentArea>;
  return <StaffArea><StaffHome user={user} /></StaffArea>;
}
