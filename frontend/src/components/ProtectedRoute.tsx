import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings, ALL_PAGES, type PageKey } from '../context/SettingsContext'
import Layout from './Layout'
import { ShieldOff } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  /** Page key checked against the RBAC privilege matrix. Omit to only require login. */
  page?: PageKey
  /** Restrict to Fleet Manager (e.g. Settings). */
  managerOnly?: boolean
}

export default function ProtectedRoute({ children, page, managerOnly = false }: ProtectedRouteProps) {
  const { user } = useAuth()
  const { canAccess } = useSettings()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const denied = (managerOnly && user.role !== 'Fleet Manager') || (page && !canAccess(user.role, page))

  if (denied) {
    // Send the user to their first permitted module instead of looping on /dashboard
    const firstAllowed = ALL_PAGES.find((p) => p.key !== page && canAccess(user.role, p.key))
    if (firstAllowed) {
      return <Navigate to={`/${firstAllowed.key}`} replace />
    }
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <ShieldOff className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No modules assigned to your role</p>
          <p className="text-xs font-medium text-slate-400">
            Ask a Fleet Manager to grant your role access in Settings.
          </p>
        </div>
      </Layout>
    )
  }

  return <Layout>{children}</Layout>
}
