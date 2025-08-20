import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Loading } from '@/components/ui/loading'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'

// Lazy load heavy components
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Profile = lazy(() => import('@/pages/Profile'))
const Patterns = lazy(() => import('@/pages/Patterns'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Leaderboards = lazy(() => import('@/pages/Leaderboards'))
const StudyGroups = lazy(() => import('@/pages/StudyGroups'))
const Challenges = lazy(() => import('@/pages/Challenges'))
const Admin = lazy(() => import('@/pages/Admin'))

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={
                    <Suspense fallback={<Loading text="Loading dashboard..." />}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="patterns" element={
                    <Suspense fallback={<Loading text="Loading patterns..." />}>
                      <Patterns />
                    </Suspense>
                  } />
                  <Route path="profile" element={
                    <Suspense fallback={<Loading text="Loading profile..." />}>
                      <Profile />
                    </Suspense>
                  } />
                  <Route path="analytics" element={
                    <Suspense fallback={<Loading text="Loading analytics..." />}>
                      <Analytics />
                    </Suspense>
                  } />
                  <Route path="leaderboards" element={
                    <Suspense fallback={<Loading text="Loading leaderboards..." />}>
                      <Leaderboards />
                    </Suspense>
                  } />
                  <Route path="study-groups" element={
                    <Suspense fallback={<Loading text="Loading study groups..." />}>
                      <StudyGroups />
                    </Suspense>
                  } />
                  <Route path="challenges" element={
                    <Suspense fallback={<Loading text="Loading challenges..." />}>
                      <Challenges />
                    </Suspense>
                  } />
                  <Route path="admin" element={
                    <Suspense fallback={<Loading text="Loading admin panel..." />}>
                      <Admin />
                    </Suspense>
                  } />
                </Route>
                
                {/* Catch all - redirect to dashboard or login */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
