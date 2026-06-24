import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Onboarding
import { ChangePasswordPage } from './pages/onboarding/ChangePasswordPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';

// App Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ContactsPage } from './pages/contacts/ContactsPage';
import { ContactDetailPage } from './pages/contacts/ContactDetailPage';
import { DealsKanbanPage } from './pages/deals/DealsKanbanPage';
import { DealDetailPage } from './pages/deals/DealDetailPage';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { TeamPage } from './pages/team/TeamPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { BillingPage } from './pages/billing/BillingPage';

// Store
import { useAuthStore } from './store/authStore';

// Platform Admin
import { PlatformAdminLogin } from './pages/platform/PlatformAdminLogin';
import { PlatformAdminLayout } from './pages/platform/PlatformAdminLayout';
import { PlatformDashboard } from './pages/platform/PlatformDashboard';
import { PlatformOrganizations } from './pages/platform/PlatformOrganizations';
import { PlatformOrgDetail } from './pages/platform/PlatformOrgDetail';
import { ThemeProvider } from './context/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route — redirects to /login if not authenticated
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Admin-only route
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public route — redirects to /dashboard if already logged in
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Onboarding — protected but not app-layout */}
            <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

            {/* Main App */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Contacts */}
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="contacts/new" element={<ContactsPage />} />
              <Route path="contacts/:id" element={<ContactDetailPage />} />

              {/* Deals */}
              <Route path="deals" element={<DealsKanbanPage />} />
              <Route path="deals/:id" element={<DealDetailPage />} />

              {/* Activities */}
              <Route path="activities" element={<ActivitiesPage />} />

              {/* Reports */}
              <Route path="reports" element={<ReportsPage />} />

              {/* Team — admin only */}
              <Route path="team" element={<AdminRoute><TeamPage /></AdminRoute>} />

              {/* Billing — admin only */}
              <Route path="billing" element={<AdminRoute><BillingPage /></AdminRoute>} />

              {/* Settings */}
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Platform Admin */}
            <Route path="/platform-admin/login" element={<PlatformAdminLogin />} />
            <Route path="/platform-admin" element={<PlatformAdminLayout />}>
              <Route index element={<PlatformDashboard />} />
              <Route path="organizations" element={<PlatformOrganizations />} />
              <Route path="organizations/:id" element={<PlatformOrgDetail />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
