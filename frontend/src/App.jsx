import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Resources from "./pages/Resources.jsx";
import ResourceDetail from "./pages/ResourceDetail.jsx";
import Emergency from "./pages/Emergency.jsx";
import AnonymousConcern from "./pages/AnonymousConcern.jsx";
import ResponsePortal from "./pages/ResponsePortal.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import StudentArea from "./components/StudentArea.jsx";
import Concerns from "./pages/Concerns.jsx";
import ConcernDetail from "./pages/ConcernDetail.jsx";
import Inbox from "./pages/Inbox.jsx";
import Referrals from "./pages/Referrals.jsx";
import ReferralDetail from "./pages/ReferralDetail.jsx";
import Appointments from "./pages/Appointments.jsx";
import Notifications from "./pages/Notifications.jsx";
import StaffArea from "./components/StaffArea.jsx";
import { AnonymousList, ConcernList, AppointmentList } from "./pages/QueueList.jsx";
import StaffAnonymousDetail from "./pages/StaffAnonymousDetail.jsx";
import StaffConcernDetail from "./pages/StaffConcernDetail.jsx";
import StaffAppointmentDetail from "./pages/StaffAppointmentDetail.jsx";
import StaffReferrals from "./pages/StaffReferrals.jsx";
import StaffReferralDetail from "./pages/StaffReferralDetail.jsx";
import StaffResources from "./pages/StaffResources.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminReferrals from "./pages/AdminReferrals.jsx";
import AdminEmergency from "./pages/AdminEmergency.jsx";
import AdminAudit from "./pages/AdminAudit.jsx";

const PRO = ["professional"], AMB_PRO = ["ambassador", "professional"], PRO_ADMIN = ["professional", "admin"], ADMIN = ["admin"];
const R = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="resources" element={<Resources />} />
        <Route path="resources/:id" element={<ResourceDetail />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="anonymous" element={<AnonymousConcern />} />
        <Route path="portal" element={<ResponsePortal />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route element={<ProtectedRoute roles={["student"]}><StudentArea /></ProtectedRoute>}>
          <Route path="concerns" element={<Concerns />} />
          <Route path="concerns/:id" element={<ConcernDetail />} />
          <Route path="messages" element={<Inbox />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="referrals/:id" element={<ReferralDetail />} />
          <Route path="appointments" element={<Appointments />} />
        </Route>
        <Route element={<ProtectedRoute roles={["ambassador", "professional", "admin"]}><StaffArea /></ProtectedRoute>}>
          <Route path="staff/anonymous" element={R(PRO, <AnonymousList />)} />
          <Route path="staff/anonymous/:id" element={R(PRO, <StaffAnonymousDetail />)} />
          <Route path="staff/concerns" element={R(PRO, <ConcernList />)} />
          <Route path="staff/concerns/:id" element={R(PRO, <StaffConcernDetail />)} />
          <Route path="staff/appointments" element={R(PRO, <AppointmentList />)} />
          <Route path="staff/appointments/:id" element={R(PRO, <StaffAppointmentDetail />)} />
          <Route path="staff/referrals" element={R(AMB_PRO, <StaffReferrals />)} />
          <Route path="staff/referrals/:id" element={R(AMB_PRO, <StaffReferralDetail />)} />
          <Route path="staff/resources" element={R(PRO_ADMIN, <StaffResources />)} />
          <Route path="staff/users" element={R(ADMIN, <AdminUsers />)} />
          <Route path="staff/referral-monitor" element={R(ADMIN, <AdminReferrals />)} />
          <Route path="staff/emergency" element={R(ADMIN, <AdminEmergency />)} />
          <Route path="staff/audit" element={R(ADMIN, <AdminAudit />)} />
        </Route>
        <Route path="*" element={<p className="py-16 text-center">Page not found.</p>} />
      </Route>
    </Routes>
  );
}
