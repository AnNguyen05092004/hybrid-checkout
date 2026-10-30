import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider, useStore } from "./app/store";
import { HOME } from "./app/home";
import type { Role } from "./mocks/seed";
import { Toasts } from "./components/ui";
import { AdminLayout } from "./layouts/AdminLayout";
import { PosLayout } from "./layouts/PosLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { ProfilePage } from "./features/auth/ProfilePage";
import { ForbiddenPage } from "./features/auth/ForbiddenPage";
import { OpenShiftPage } from "./features/pos/OpenShiftPage";
import { PosPage } from "./features/pos/PosPage";
import { ShiftPage } from "./features/pos/ShiftPage";
import { DashboardPage } from "./features/store/DashboardPage";
import { AlertsPage } from "./features/store/AlertsPage";
import { TransactionsPage } from "./features/store/TransactionsPage";
import { TransactionDetailPage } from "./features/store/TransactionDetailPage";
import { SkusPage } from "./features/store/SkusPage";
import { SkuDetailPage } from "./features/store/SkuDetailPage";
import { BatchesPage } from "./features/store/BatchesPage";
import { BatchDetailPage } from "./features/store/BatchDetailPage";
import { LabelingPage } from "./features/ml/LabelingPage";
import { SamplesPage } from "./features/ml/SamplesPage";
import { JobsPage } from "./features/ml/JobsPage";
import { ModelsPage } from "./features/ml/ModelsPage";
import { ModelDetailPage } from "./features/ml/ModelDetailPage";
import { ThresholdsPage } from "./features/ml/ThresholdsPage";
import { MonitoringPage } from "./features/ml/MonitoringPage";
import { UsersPage } from "./features/admin/UsersPage";
import { CountersPage } from "./features/admin/CountersPage";
import { AuditPage } from "./features/admin/AuditPage";
import { SettingsPage } from "./features/admin/SettingsPage";

const M: Role[] = ["STORE_MANAGER"];
const ML: Role[] = ["ML_ENGINEER"];
const MML: Role[] = ["STORE_MANAGER", "ML_ENGINEER"];
const AD: Role[] = ["ADMIN"];
const POS: Role[] = ["CASHIER", "STORE_MANAGER"];

/** Route guard. The backend will enforce the same matrix (BR-15); this only shapes the UI. */
function Allow({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

function Home() {
  const { user } = useStore();
  return <Navigate to={user ? HOME[user.role] : "/login"} replace />;
}

function PosIndex() {
  const { shift } = useStore();
  return shift ? <PosPage /> : <Navigate to="/pos/open-shift" replace />;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pos" element={<Allow roles={POS}><PosLayout /></Allow>}>
            <Route index element={<PosIndex />} />
            <Route path="open-shift" element={<OpenShiftPage />} />
            <Route path="shift" element={<ShiftPage />} />
          </Route>
          <Route element={<Allow roles={[...MML, ...AD]}><AdminLayout /></Allow>}>
            <Route path="/dashboard" element={<Allow roles={MML}><DashboardPage /></Allow>} />
            <Route path="/alerts" element={<Allow roles={MML}><AlertsPage /></Allow>} />
            <Route path="/transactions" element={<Allow roles={M}><TransactionsPage /></Allow>} />
            <Route path="/transactions/:id" element={<Allow roles={MML}><TransactionDetailPage /></Allow>} />
            <Route path="/skus" element={<Allow roles={MML}><SkusPage /></Allow>} />
            <Route path="/skus/:id" element={<Allow roles={MML}><SkuDetailPage /></Allow>} />
            <Route path="/batches" element={<Allow roles={MML}><BatchesPage /></Allow>} />
            <Route path="/batches/:id" element={<Allow roles={MML}><BatchDetailPage /></Allow>} />
            <Route path="/batches/:id/samples" element={<Allow roles={MML}><SamplesPage /></Allow>} />
            <Route path="/batches/:id/label" element={<Allow roles={ML}><LabelingPage /></Allow>} />
            <Route path="/jobs" element={<Allow roles={ML}><JobsPage /></Allow>} />
            <Route path="/models" element={<Allow roles={MML}><ModelsPage /></Allow>} />
            <Route path="/models/:id" element={<Allow roles={MML}><ModelDetailPage /></Allow>} />
            <Route path="/thresholds" element={<Allow roles={ML}><ThresholdsPage /></Allow>} />
            <Route path="/monitoring" element={<Allow roles={MML}><MonitoringPage /></Allow>} />
            <Route path="/admin/users" element={<Allow roles={AD}><UsersPage /></Allow>} />
            <Route path="/admin/counters" element={<Allow roles={AD}><CountersPage /></Allow>} />
            <Route path="/admin/audit" element={<Allow roles={[...AD, ...M]}><AuditPage /></Allow>} />
            <Route path="/admin/settings" element={<Allow roles={AD}><SettingsPage /></Allow>} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <Toasts />
      </BrowserRouter>
    </StoreProvider>
  );
}
