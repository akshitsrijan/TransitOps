import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { computeDashboardKpis } from '../lib/metrics'
import { Card, PageHeader, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'

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
    { label: 'Active Vehicles', value: kpis.activeVehicles },
    { label: 'Available Vehicles', value: kpis.availableVehicles },
    { label: 'Vehicles in Maintenance', value: kpis.vehiclesInMaintenance },
    { label: 'Active Trips', value: kpis.activeTrips },
    { label: 'Pending Trips', value: kpis.pendingTrips },
    { label: 'Drivers On Duty', value: kpis.driversOnDuty },
    { label: 'Fleet Utilization', value: `${kpis.fleetUtilizationPct}%` },
  ]

  const recentTrips = [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <div>
      <PageHeader title={`Welcome, ${user?.name.split(' ')[0]}`} subtitle="Fleet overview and key operational metrics." />

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
          {types.map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? 'All Vehicle Types' : t}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
          {regions.map((r) => (
            <option key={r} value={r}>
              {r === 'All' ? 'All Regions' : r}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Trips</h2>
        {recentTrips.length === 0 ? (
          <p className="text-sm text-slate-500">No trips yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-3">Route</th>
                <th className="py-2 pr-3">Vehicle</th>
                <th className="py-2 pr-3">Driver</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.map((t) => {
                const vehicle = vehicles.find((v) => v.id === t.vehicleId)
                const driver = drivers.find((d) => d.id === t.driverId)
                return (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-700">
                      {t.source} → {t.destination}
                    </td>
                    <td className="py-2 pr-3 text-slate-700">{vehicle?.registrationNumber ?? '—'}</td>
                    <td className="py-2 pr-3 text-slate-700">{driver?.name ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
