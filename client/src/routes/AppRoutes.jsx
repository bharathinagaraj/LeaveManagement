import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import EmployeeDashboard from "@/pages/employee/EmployeeDashboard";
import ApplyLeave from "@/pages/employee/ApplyLeave";
import MyRequests from "@/pages/employee/MyRequests";
import ManagerDashboard from "@/pages/manager/ManagerDashboard";
import PendingRequests from "@/pages/manager/PendingRequests";
import RequestDetailsPage from "@/pages/manager/RequestDetailsPage";
import ProcessedRequests from "@/pages/manager/ProcessedRequests";
import TeamManagement from "@/pages/manager/TeamManagement";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Employee */}
        <Route
          index
          element={
            <RoleRoute role="employee">
              <EmployeeDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="apply"
          element={
            <RoleRoute role="employee">
              <ApplyLeave />
            </RoleRoute>
          }
        />
        <Route
          path="my-requests"
          element={
            <RoleRoute role="employee">
              <MyRequests />
            </RoleRoute>
          }
        />

        {/* Manager */}
        <Route
          path="manager"
          element={
            <RoleRoute role="manager">
              <ManagerDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="manager/pending"
          element={
            <RoleRoute role="manager">
              <PendingRequests />
            </RoleRoute>
          }
        />
        <Route
          path="manager/requests/:id"
          element={
            <RoleRoute role="manager">
              <RequestDetailsPage />
            </RoleRoute>
          }
        />
        <Route
          path="manager/processed"
          element={
            <RoleRoute role="manager">
              <ProcessedRequests />
            </RoleRoute>
          }
        />
        <Route
          path="manager/team"
          element={
            <RoleRoute role="manager">
              <TeamManagement />
            </RoleRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}