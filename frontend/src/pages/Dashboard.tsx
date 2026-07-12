import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { computeDashboardKpis } from '../lib/metrics'
import { Card, PageHeader, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import {
  Truck,
  Sparkles,
  Wrench,
  Navigation,
  Clock,
  Users,
  Percent,
  ArrowRight,
  Filter,
  Calendar,
  Layers
} from 'lucide-react'

export default function Dashboard() {
  const { vehicles, drivers, trips } = useData()
  const { user } = useAuth()
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [regionFilter, setRegionFilter] = useState('All')

  const types = useMemo(() => ['All', ...new Set(vehicles.map((v) => v.type))], [vehicles])
  const regions = useMemo(() => ['All', ...new Set(vehicles.map((v) => v.region))], [vehicles])
  const statuses = ['All', 'Available', 'On Trip', 'In Shop', 'Retired']

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (typeFilter === 'All' || v.type === typeFilter) &&
          (statusFilter === 'All' || v.status === statusFilter) &&
          (regionFilter === 'All' || v.region === regionFilter),
      ),
    [vehicles, typeFilter, statusFilter, regionFilter],
  )

  const kpis = useMemo(() => computeDashboardKpis(filteredVehicles, drivers, trips), [filteredVehicles, drivers, trips])

  const kpiCards = [
    {
      label: 'Active Vehicles',
      value: kpis.activeVehicles,
      icon: Truck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50/50'
    },
    {
      label: 'Available Vehicles',
      value: kpis.availableVehicles,
      icon: Sparkles,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/50'
    },
    {
      label: 'In Maintenance',
      value: kpis.vehiclesInMaintenance,
      icon: Wrench,
      color: 'text-amber-600',
      bg: 'bg-amber-50/50'
    },
    {
      label: 'Active Trips',
      value: kpis.activeTrips,
      icon: Navigation,
      color: 'text-blue-600',
      bg: 'bg-blue-50/50'
    },
    {
      label: 'Pending Trips',
      value: kpis.pendingTrips,
      icon: Clock,
      color: 'text-slate-600',
      bg: 'bg-slate-100/60'
    },
    {
      label: 'Drivers On Duty',
      value: kpis.driversOnDuty,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50/50'
    },
    {
      label: 'Fleet Utilization',
      value: `${kpis.fleetUtilizationPct}%`,
      icon: Percent,
      color: 'text-rose-600',
      bg: 'bg-rose-50/50',
      progress: kpis.fleetUtilizationPct
    }
  ]

  const recentTrips = [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle="Manage fleet utilization, tracking, dispatches, and compliance safety metrics live."
      />

      {/* Modern Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm shadow-slate-100/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Active Scope Filters</h3>
            <p className="text-[10px] text-slate-500 font-medium">Refining dashboard KPIs in real-time</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 bg-slate-50/50 cursor-pointer"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === 'All' ? 'All Vehicle Types' : t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 bg-slate-50/50 cursor-pointer"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 bg-slate-50/50 cursor-pointer"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r === 'All' ? 'All Regions' : r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {kpiCards.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.label} className="relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                    {k.label}
                  </p>
                  <p className="mt-2.5 text-3xl font-black text-slate-900 tracking-tight">
                    {k.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${k.bg} ${k.color} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              {k.progress !== undefined && (
                <div className="mt-4">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, k.progress))}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips Logs */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Recent Dispatch Logs</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Live Stream</span>
          </div>

          {recentTrips.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No recent trip logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 pr-4">Route Info</th>
                    <th className="py-3 pr-4">Assigned Vehicle</th>
                    <th className="py-3 pr-4">Operator / Driver</th>
                    <th className="py-3 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTrips.map((t) => {
                    const vehicle = vehicles.find((v) => v.id === t.vehicleId)
                    const driver = drivers.find((d) => d.id === t.driverId)
                    return (
                      <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{t.source}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
                            <span className="font-semibold text-slate-800">{t.destination}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">ID: {t.id}</span>
                        </td>
                        <td className="py-4 pr-4 font-semibold text-slate-700">
                          {vehicle ? (
                            <span className="inline-flex items-center gap-1.5 bg-slate-100/55 rounded px-2 py-1 text-xs border border-slate-200/40">
                              <Truck className="h-3 w-3 text-slate-500" />
                              {vehicle.registrationNumber}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-4 pr-4 font-medium text-slate-700">
                          {driver?.name ?? '—'}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <StatusBadge status={t.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick Informational Panel */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-5 border-b border-slate-50 pb-3">
              <Layers className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Active Quick Tips</h2>
            </div>
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50/30 rounded-xl border border-indigo-100/40 text-xs">
                <p className="font-bold text-indigo-950 mb-1">Weekly License Inspection</p>
                <p className="text-slate-600 leading-relaxed">
                  Always inspect driver licenses on the <strong>Drivers</strong> screen to prevent legal compliance violations. Expired operators are auto-restricted from new dispatches.
                </p>
              </div>
              <div className="p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-100/40 text-xs">
                <p className="font-bold text-emerald-950 mb-1">Fuel Economy Audit</p>
                <p className="text-slate-600 leading-relaxed">
                  Log precise mileage odometer values and fuel receipt totals on the <strong>Fuel & Expenses</strong> panel to update active dashboard utilization metrics accurately.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-50">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Operational Mode</span>
              <span className="text-indigo-600 font-bold">Standard Fleet</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

