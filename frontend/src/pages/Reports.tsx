import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { ASSUMED_REVENUE_PER_KM } from '../context/DataContext'
import { computeVehicleReport, downloadCsv, toCsv } from '../lib/metrics'
import { Button, Card, PageHeader } from '../components/ui'
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Fuel,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  Download
} from 'lucide-react'

export default function Reports() {
  const { vehicles, trips, maintenanceLogs, fuelLogs, expenses } = useData()

  const rows = useMemo(
    () => computeVehicleReport(vehicles, trips, maintenanceLogs, fuelLogs, expenses),
    [vehicles, trips, maintenanceLogs, fuelLogs, expenses],
  )

  const summary = useMemo(() => {
    let totalRevenue = 0
    let totalCost = 0
    let totalDistance = 0
    let totalFuel = 0
    let bestRoi = { registrationNumber: '—', roi: -Infinity }
    let lowestEfficiency = { registrationNumber: '—', efficiency: Infinity }

    for (const r of rows) {
      totalRevenue += r.estimatedRevenue
      totalCost += r.operationalCost
      totalDistance += r.totalDistanceKm
      totalFuel += r.totalFuelLiters

      if (r.roiPct !== null && r.roiPct > bestRoi.roi) {
        bestRoi = { registrationNumber: r.registrationNumber, roi: r.roiPct }
      }
      if (r.fuelEfficiencyKmPerL !== null && r.fuelEfficiencyKmPerL < lowestEfficiency.efficiency) {
        lowestEfficiency = { registrationNumber: r.registrationNumber, efficiency: r.fuelEfficiencyKmPerL }
      }
    }

    const overallRoi = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0
    const averageEfficiency = totalFuel > 0 ? Number((totalDistance / totalFuel).toFixed(2)) : 0

    return {
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      overallRoi,
      averageEfficiency,
      bestRoi: bestRoi.roi !== -Infinity ? bestRoi : null,
      lowestEfficiency: lowestEfficiency.efficiency !== Infinity ? lowestEfficiency : null,
    }
  }, [rows])

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
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Fleet Analytics & Reports"
        subtitle="Executive-level ROI reporting, fuel efficiency checks, and operational margin tracking."
        action={
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Export Fleet CSV</span>
          </Button>
        }
      />

      <div className="rounded-xl bg-indigo-50 border border-indigo-100/60 p-4 text-xs font-bold text-indigo-950 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
        <div>
          <p className="mb-1 uppercase tracking-wider text-[10px] text-indigo-500">Methodology Note</p>
          <p className="font-semibold text-indigo-900 leading-relaxed">
            ROI metrics assume a standard revenue tier of ${ASSUMED_REVENUE_PER_KM.toFixed(2)}/km calculated on closed trip odometer distances. All fleet logs are consolidated in real-time.
          </p>
        </div>
      </div>

      {/* Executive Bento highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between p-5 relative overflow-hidden group">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Estimated Gross Revenue</p>
            <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">${summary.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="absolute top-4 right-4 p-2.5 bg-slate-100 rounded-lg text-slate-600">
            <DollarSign className="h-4 w-4" />
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-5 relative overflow-hidden group">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Fleet Cost</p>
            <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">${summary.totalCost.toLocaleString()}</p>
          </div>
          <div className="absolute top-4 right-4 p-2.5 bg-slate-100 rounded-lg text-slate-600">
            <Activity className="h-4 w-4" />
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-5 relative overflow-hidden group">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Estimated Margin / Profit</p>
            <p className={`text-2xl font-black mt-2 tracking-tight ${summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ${summary.totalProfit.toLocaleString()}
            </p>
          </div>
          <div className="absolute top-4 right-4 p-2.5 bg-slate-100 rounded-lg text-slate-600">
            {summary.totalProfit >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-5 relative overflow-hidden group">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Combined Fleet ROI</p>
            <p className={`text-2xl font-black mt-2 tracking-tight ${summary.overallRoi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {summary.overallRoi}%
            </p>
          </div>
          <div className="absolute top-4 right-4 p-2.5 bg-slate-100 rounded-lg text-slate-600">
            <ArrowUpRight className="h-4 w-4 text-slate-500" />
          </div>
        </Card>
      </div>

      {/* Fleet Anomalies & Winners board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex items-center gap-4 border border-emerald-100 bg-emerald-50/10">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Highest ROI Performer</p>
            {summary.bestRoi ? (
              <p className="text-slate-800 font-extrabold mt-0.5">
                Vehicle <strong className="text-indigo-600">{summary.bestRoi.registrationNumber}</strong> at{' '}
                <strong className="text-emerald-700">+{summary.bestRoi.roi}% ROI</strong>
              </p>
            ) : (
              <p className="text-slate-400 text-xs font-semibold mt-0.5">No metrics yet</p>
            )}
          </div>
        </Card>

        <Card className="flex items-center gap-4 border border-amber-100 bg-amber-50/10">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Fuel className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">Fuel Audit Action Required</p>
            {summary.lowestEfficiency && summary.lowestEfficiency.efficiency !== Infinity ? (
              <p className="text-slate-800 font-extrabold mt-0.5">
                Vehicle <strong className="text-indigo-600">{summary.lowestEfficiency.registrationNumber}</strong> lowest at{' '}
                <strong className="text-amber-700">{summary.lowestEfficiency.efficiency} km/L</strong>
              </p>
            ) : (
              <p className="text-slate-400 text-xs font-semibold mt-0.5">All vehicles within compliance bounds</p>
            )}
          </div>
        </Card>
      </div>

      {/* Main Reports Table Board */}
      <Card className="p-0 overflow-hidden border border-slate-100">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 bg-slate-50/40">
          <FileText className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Consolidated Vehicle Performance Sheet</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Vehicle Plaque</th>
                <th className="px-6 py-4">Total Trips</th>
                <th className="px-6 py-4">Logged Distance</th>
                <th className="px-6 py-4">Fuel Compliance</th>
                <th className="px-6 py-4">Fuel Billing</th>
                <th className="px-6 py-4">Shop Expenses</th>
                <th className="px-6 py-4">Combined Costs</th>
                <th className="px-6 py-4 text-right">Estimated ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => {
                // Calculate percentage bar for ROI comparison visual
                const roiProgress = Math.min(100, Math.max(0, r.roiPct ?? 0))

                return (
                  <tr key={r.vehicleId} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-extrabold text-slate-900">{r.registrationNumber}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{r.tripCount}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{r.totalDistanceKm.toLocaleString()} km</td>
                    <td className="px-6 py-4">
                      {r.fuelEfficiencyKmPerL ? (
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-700 text-xs">{r.fuelEfficiencyKmPerL} km/L</span>
                          <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1 rounded-full"
                              style={{ width: `${Math.min(100, r.fuelEfficiencyKmPerL * 8)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">${r.fuelCost.toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">${r.maintenanceCost.toLocaleString()}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">${r.operationalCost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className={`font-black text-sm ${r.roiPct != null && r.roiPct < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {r.roiPct != null ? `${r.roiPct}%` : '—'}
                        </span>
                        {r.roiPct != null && r.roiPct >= 0 && (
                          <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-emerald-500 h-1 rounded-full"
                              style={{ width: `${roiProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
