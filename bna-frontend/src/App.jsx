import React from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'

import NotificationToastDispatcher from './clients/notifications/NotificationToastDispatcher'
import Footer from './components/layout/Footer'
import Navbar from './components/layout/Navbar'
import { LanguageProvider } from './contexts/LanguageContext'
import AdminDashboard from './pages/AdminDashboard'
import AgentDashboard from './pages/AgentDashboard'
import Agencies from './pages/Agencies'
import AgencyDetail from './pages/AgencyDetail'
import AppointmentDetail from './pages/AppointmentDetail'
import AppointmentForm from './pages/AppointmentForm'
import Appointments from './pages/Appointments'
import Assistant from './pages/Assistant'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Login from './pages/auth/Login'
import NotFound from './pages/NotFound'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Register from './pages/auth/Register'
import ServiceDetail from './pages/ServiceDetail'
import Services from './pages/Services'
import Support from './pages/Support'
import {
  useAuthIsLoading,
  useIsAuthenticated,
  useUserRole,
} from './store/hooks'

/**
 * Route guard. Reads auth state from Redux, not from any context.
 */
function ProtectedRoute({ children, requiredRole = null }) {
  const isAuthenticated = useIsAuthenticated()
  const role = useUserRole()
  const isLoading = useAuthIsLoading()

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/404" replace />
  }

  return children
}

/**
 * Global hydration gate. main.jsx flips isLoading to false synchronously
 * after the store is built, so this only shows the spinner during the
 * very first render — preventing a flash of /login for a returning user.
 */
function AppContent() {
  const isLoading = useAuthIsLoading()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bna-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/agencies/:id" element={<AgencyDetail />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/support" element={<Support />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/new"
            element={
              <ProtectedRoute>
                <AppointmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/:id/edit"
            element={
              <ProtectedRoute>
                <AppointmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/:id"
            element={
              <ProtectedRoute>
                <AppointmentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent"
            element={
              <ProtectedRoute requiredRole="agent">
                <AgentDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
      <Footer />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: {
            duration: 3000,
            iconTheme: { primary: '#006633', secondary: '#fff' },
          },
          error: {
            duration: 5000,
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />

      <NotificationToastDispatcher />
    </div>
  )
}

function App() {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <Router>
          <AppContent />
        </Router>
      </LanguageProvider>
    </HelmetProvider>
  )
}

export default App
