import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useEffect } from "react"
import ErrorBoundary from "./components/layout/ErrorBoundary"
import Layout from "./components/layout/Layout"
import { PageSkeleton } from "./components/ui/Feedback"
import { ToastProvider } from "./components/ui/Toast"
import { AuthProvider } from "./lib/auth"
import { ThemeProvider } from "./lib/theme"
import Explore from "./pages/Explore"
import Portfolio from "./pages/Portfolio"
import { About, LegacyPortfolioRedirect, Login, NotFound, RequireAuth } from "./pages/StaticPages"

// Heavier, less visited pages load on demand.
const ProjectPage = lazy(() => import("./pages/ProjectPage"))
const People = lazy(() => import("./pages/People"))
const CommunityPage = lazy(() => import("./pages/People").then((m) => ({ default: m.CommunityPage })))
const MapPage = lazy(() => import("./pages/MapPage"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollTo, which must not be returned to React.
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ScrollToTop />
            <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Explore />} />
                  <Route path="u/:handle" element={<Portfolio />} />
                  <Route path="u/:handle/:slug" element={<ProjectPage />} />
                  <Route path="people" element={<People />} />
                  <Route path="c/:slug" element={<CommunityPage />} />
                  <Route path="map" element={<MapPage />} />
                  <Route path="about" element={<About />} />
                  <Route path="login" element={<Login />} />
                  <Route
                    path="dashboard"
                    element={
                      <RequireAuth>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="settings/profile"
                    element={
                      <RequireAuth>
                        <ProfileSettings />
                      </RequireAuth>
                    }
                  />
                  {/* Old URLs */}
                  <Route path="portfolios/:username" element={<LegacyPortfolioRedirect />} />
                  <Route path="profile" element={<Navigate to="/dashboard" replace />} />
                  <Route path="profile/edit" element={<Navigate to="/settings/profile" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
