import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-base-950">
        <div className="text-accent-cyan animate-pulse font-mono">Restoring session…</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requireRole && user.role !== requireRole) return <Navigate to="/dashboard" replace />

  return children
}
