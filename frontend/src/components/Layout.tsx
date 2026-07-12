import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings, type PageKey } from '../context/SettingsContext'
import {
  LayoutDashboard,
  Truck,
  Users,
  MapPin,
  Wrench,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react'

const navItems: { to: string; page: PageKey; label: string; icon: typeof Truck }[] = [
  { to: '/dashboard', page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vehicles', page: 'vehicles', label: 'Vehicles', icon: Truck },
  { to: '/drivers', page: 'drivers', label: 'Drivers', icon: Users },
  { to: '/trips', page: 'trips', label: 'Trips', icon: MapPin },
  { to: '/maintenance', page: 'maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/expenses', page: 'expenses', label: 'Fuel & Expenses', icon: Receipt },
  { to: '/reports', page: 'reports', label: 'Reports', icon: BarChart3 },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { canAccess } = useSettings()

  const visibleItems = navItems.filter((item) => canAccess(user?.role, item.page))

  // Get initials for profile avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/10">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-extrabold tracking-tight text-slate-900">
              Transit<span className="text-indigo-600">Ops</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Smart Compliance
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {visibleItems.map((item) => {
            const IconComponent = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm border-l-4 border-indigo-600 pl-3'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <IconComponent className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm border-l-4 border-indigo-600 pl-3'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* User Card Profile Footer */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">{user?.name || 'Operator'}</p>
              <p className="truncate text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                {user?.role || 'Guest'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-x-hidden p-8 lg:p-10">{children}</main>
    </div>
  )
}

