import type { Driver, Expense, FuelLog, MaintenanceLog, Trip, Vehicle } from '../types'
import { ASSUMED_REVENUE_PER_KM } from '../context/DataContext'

export interface DashboardKpis {
  activeVehicles: number
  availableVehicles: number
  vehiclesInMaintenance: number
  activeTrips: number
  pendingTrips: number
  driversOnDuty: number
  fleetUtilizationPct: number
}

export function computeDashboardKpis(vehicles: Vehicle[], drivers: Driver[], trips: Trip[]): DashboardKpis {
  const nonRetired = vehicles.filter((v) => v.status !== 'Retired')
  const availableVehicles = vehicles.filter((v) => v.status === 'Available').length
  const vehiclesOnTrip = vehicles.filter((v) => v.status === 'On Trip').length
  const vehiclesInMaintenance = vehicles.filter((v) => v.status === 'In Shop').length
  const activeTrips = trips.filter((t) => t.status === 'Dispatched').length
  const pendingTrips = trips.filter((t) => t.status === 'Draft').length
  const driversOnDuty = drivers.filter((d) => d.status === 'On Trip' || d.status === 'Available').length

  return {
    activeVehicles: nonRetired.length,
    availableVehicles,
    vehiclesInMaintenance,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilizationPct: nonRetired.length ? Math.round((vehiclesOnTrip / nonRetired.length) * 1000) / 10 : 0,
  }
}

export interface VehicleReportRow {
  vehicleId: string
  registrationNumber: string
  totalDistanceKm: number
  totalFuelLiters: number
  fuelEfficiencyKmPerL: number | null
  fuelCost: number
  maintenanceCost: number
  otherExpenses: number
  operationalCost: number
  estimatedRevenue: number
  roiPct: number | null
  tripCount: number
}

export function computeVehicleReport(
  vehicles: Vehicle[],
  trips: Trip[],
  maintenanceLogs: MaintenanceLog[],
  fuelLogs: FuelLog[],
  expenses: Expense[],
): VehicleReportRow[] {
  return vehicles.map((v) => {
    const completedTrips = trips.filter((t) => t.vehicleId === v.id && t.status === 'Completed')
    const totalDistanceKm = completedTrips.reduce((sum, t) => sum + (t.actualDistanceKm ?? 0), 0)
    const tripFuel = completedTrips.reduce((sum, t) => sum + (t.fuelConsumedLiters ?? 0), 0)
    const logFuel = fuelLogs.filter((f) => f.vehicleId === v.id).reduce((sum, f) => sum + f.liters, 0)
    const totalFuelLiters = tripFuel + logFuel

    const fuelCost = fuelLogs.filter((f) => f.vehicleId === v.id).reduce((sum, f) => sum + f.cost, 0)
    const maintenanceCost = maintenanceLogs.filter((m) => m.vehicleId === v.id).reduce((sum, m) => sum + m.cost, 0)
    const otherExpenses = expenses.filter((e) => e.vehicleId === v.id).reduce((sum, e) => sum + e.amount, 0)
    const operationalCost = fuelCost + maintenanceCost + otherExpenses

    const estimatedRevenue = Math.round(totalDistanceKm * ASSUMED_REVENUE_PER_KM * 100) / 100
    const roiPct = v.acquisitionCost
      ? Math.round(((estimatedRevenue - (maintenanceCost + fuelCost)) / v.acquisitionCost) * 1000) / 10
      : null

    return {
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      totalDistanceKm,
      totalFuelLiters,
      fuelEfficiencyKmPerL: totalFuelLiters > 0 ? Math.round((totalDistanceKm / totalFuelLiters) * 100) / 100 : null,
      fuelCost,
      maintenanceCost,
      otherExpenses,
      operationalCost,
      estimatedRevenue,
      roiPct,
      tripCount: completedTrips.length,
    }
  })
}

export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (val: string | number) => {
    const s = String(val)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))]
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
