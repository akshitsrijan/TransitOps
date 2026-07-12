import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { ASSUMED_REVENUE_PER_KM } from '../context/DataContext'
import { computeVehicleReport, downloadCsv, toCsv } from '../lib/metrics'
import { Button, Card, PageHeader } from '../components/ui'

export default function Reports() {
  const { vehicles, trips, maintenanceLogs, fuelLogs, expenses } = useData()

  const rows = useMemo(
    () => computeVehicleReport(vehicles, trips, maintenanceLogs, fuelLogs, expenses),
    [vehicles, trips, maintenanceLogs, fuelLogs, expenses],
  )

  function handleExport() {
    const csv = toCsv(
      rows.map((r) => ({
        Vehicle: r.registrationNumber,
        'Trips Completed': r.tripCount,
        'Distance (km)': r.totalDistanceKm,
        'Fuel (L)': r.totalFuelLiters,
        'Fuel Efficiency (km/L)': r.fuelEfficiencyKmPerL ?? '',
        'Fuel Cost': r.fuelCost,
        'Maintenance Cost': r.maintenanceCost,
        'Other Expenses': r.otherExpenses,
        'Operational Cost': r.operationalCost,
        'Estimated Revenue': r.estimatedRevenue,
        'ROI (%)': r.roiPct ?? '',
      })),
    )
    downloadCsv(`transitops-fleet-report-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Fuel efficiency, fleet utilization, operational cost, and ROI per vehicle."
        action={<Button onClick={handleExport}>Export CSV</Button>}
      />

      <p className="mb-4 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
        ROI uses an assumed revenue rate of ${ASSUMED_REVENUE_PER_KM.toFixed(2)}/km on completed trip distance, since the
        data model does not yet track billed revenue.
      </p>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-4 py-2.5">Vehicle</th>
              <th className="px-4 py-2.5">Trips</th>
              <th className="px-4 py-2.5">Distance</th>
              <th className="px-4 py-2.5">Fuel Efficiency</th>
              <th className="px-4 py-2.5">Fuel Cost</th>
              <th className="px-4 py-2.5">Maintenance Cost</th>
              <th className="px-4 py-2.5">Operational Cost</th>
              <th className="px-4 py-2.5">Est. ROI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vehicleId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">{r.registrationNumber}</td>
                <td className="px-4 py-2.5 text-slate-700">{r.tripCount}</td>
                <td className="px-4 py-2.5 text-slate-700">{r.totalDistanceKm} km</td>
                <td className="px-4 py-2.5 text-slate-700">{r.fuelEfficiencyKmPerL ? `${r.fuelEfficiencyKmPerL} km/L` : '—'}</td>
                <td className="px-4 py-2.5 text-slate-700">${r.fuelCost.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-slate-700">${r.maintenanceCost.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">${r.operationalCost.toLocaleString()}</td>
                <td className={`px-4 py-2.5 font-medium ${r.roiPct != null && r.roiPct < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {r.roiPct != null ? `${r.roiPct}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
