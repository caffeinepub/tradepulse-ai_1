import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { TickerBar } from "./components/TickerBar";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";

function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TickerBar />
      <div style={{ paddingTop: "5.5rem" }}>
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}

function AdminRootLayout() {
  return (
    <>
      <Outlet />
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && !identity) {
      navigate({ to: "/" });
    }
  }, [identity, isInitializing, navigate]);

  if (isInitializing) return null;
  if (!identity) return null;
  return <>{children}</>;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: () => (
    <ProtectedRoute>
      <AnalyticsPage />
    </ProtectedRoute>
  ),
});

// Admin routes — isolated root with no Navbar/TickerBar
const adminRootRoute = createRootRoute({
  component: AdminRootLayout,
});

const adminLoginRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: "/admin",
  component: AdminLoginPage,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: "/admin/dashboard",
  component: AdminDashboardPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  profileRoute,
  analyticsRoute,
]);

const adminRouteTree = adminRootRoute.addChildren([
  adminLoginRoute,
  adminDashboardRoute,
]);

const router = createRouter({ routeTree });
const adminRouter = createRouter({ routeTree: adminRouteTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function isAdminPath() {
  return window.location.pathname.startsWith("/admin");
}

export default function App() {
  if (isAdminPath()) {
    return <RouterProvider router={adminRouter} />;
  }
  return <RouterProvider router={router} />;
}
