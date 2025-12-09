import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/app-layout";
import { useAuthStore } from "@/lib/auth-store";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import InvestorDashboard from "@/pages/investor-dashboard";
import MarketplacePage from "@/pages/marketplace";
import KycStatusPage from "@/pages/kyc-status";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsersPage from "@/pages/admin-users";
import AdminAssetsPage from "@/pages/admin-assets";
import AdminTokensPage from "@/pages/admin-tokens";
import AdminAuditPage from "@/pages/admin-audit";
import AdminDocumentsPage from "@/pages/admin-documents";
import AdminAnalyticsPage from "@/pages/admin-analytics";
import AdminAssetEditPage from "@/pages/admin-asset-edit";
import ReportsPage from "@/pages/reports";
import AdminReportsPage from "@/pages/admin-reports";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ 
  component: Component, 
  adminOnly = false 
}: { 
  component: React.ComponentType; 
  adminOnly?: boolean;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user?.role !== "ADMIN") {
    setLocation("/dashboard");
    return null;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    if (user?.role === "ADMIN") {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      
      <Route path="/login">
        <PublicRoute component={LoginPage} />
      </Route>
      
      <Route path="/register">
        <PublicRoute component={RegisterPage} />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute component={InvestorDashboard} />
      </Route>

      <Route path="/marketplace">
        <ProtectedRoute component={MarketplacePage} />
      </Route>

      <Route path="/kyc">
        <ProtectedRoute component={KycStatusPage} />
      </Route>

      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} />
      </Route>

      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} adminOnly />
      </Route>

      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsersPage} adminOnly />
      </Route>

      <Route path="/admin/assets">
        <ProtectedRoute component={AdminAssetsPage} adminOnly />
      </Route>

      <Route path="/admin/assets/new">
        <ProtectedRoute component={AdminAssetsPage} adminOnly />
      </Route>

      <Route path="/admin/tokens">
        <ProtectedRoute component={AdminTokensPage} adminOnly />
      </Route>

      <Route path="/admin/assets/:id/edit">
        <ProtectedRoute component={AdminAssetEditPage} adminOnly />
      </Route>

      <Route path="/admin/audit">
        <ProtectedRoute component={AdminAuditPage} adminOnly />
      </Route>

      <Route path="/admin/documents">
        <ProtectedRoute component={AdminDocumentsPage} adminOnly />
      </Route>

      <Route path="/admin/analytics">
        <ProtectedRoute component={AdminAnalyticsPage} adminOnly />
      </Route>

      <Route path="/admin/reports">
        <ProtectedRoute component={AdminReportsPage} adminOnly />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="tokenvault-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
