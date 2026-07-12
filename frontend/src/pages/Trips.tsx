import { useMemo, useState } from 'react'
import type { Trip, TripStatus } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'
import ExportButtons from '../components/ExportButtons'
import {
  Truck,
  Scale,
  ShieldAlert,
  ArrowRight,
  Plus,
  XCircle
} from 'lucide-react'

const emptyForm = {
  source: '',
  destination: '',
  vehicleId: '',
  driverId: '',
  cargoWeightKg: '',
  plannedDistanceKm: '',
}

const emptyCompleteForm = { actualDistanceKm: '', fuelConsumedLiters: '' }

export default function Trips() {
  const {
    trips,
    vehicles,
    drivers,
    dispatchableVehicles,
    assignableDrivers,
    createTrip,
    dispatchTrip,
    completeTrip,
    cancelTrip
  } = useData()
  const { hasRole } = useAuth()
  const { formatDistance } = useSettings()
  const canEdit = hasRole('Fleet Manager', 'Driver')

  const [statusFilter, setStatusFilter] = useState<'All' | TripStatus>('All')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null)
  const [completeForm, setCompleteForm] = useState(emptyCompleteForm)
  const [completeError, setCompleteError] = useState('')

  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const filtered = useMemo(
    () => (statusFilter === 'All' ? trips : trips.filter((t) => t.status === statusFilter)),
    [trips, statusFilter],
  )
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function vehicleLabel(id: string) {
    return vehicles.find((v) => v.id === id)?.registrationNumber ?? 'Unknown'
  }
  function driverLabel(id: string) {
    return drivers.find((d) => d.id === id)?.name ?? 'Unknown'
  }

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setCreateOpen(true)
  }

  function handleCreate() {
    const result = createTrip({
      source: form.source.trim(),
      destination: form.destination.trim(),
      vehicleId: form.vehicleId,
      driverId: form.driverId,
      cargoWeightKg: Number(form.cargoWeightKg),
      plannedDistanceKm: Number(form.plannedDistanceKm),
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAlertMessage({ type: 'success', text: 'Trip manifest drafted successfully!' })
    setCreateOpen(false)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  function handleDispatch(id: string) {
    const result = dispatchTrip(id)
    if (!result.ok) {
      setAlertMessage({ type: 'error', text: result.error })
    } else {
      setAlertMessage({ type: 'success', text: 'Trip dispatched! Status updated across the board.' })
    }
    setTimeout(() => setAlertMessage(null), 4000)
  }

  function handleCancel(id: string) {
    const result = cancelTrip(id)
    if (!result.ok) {
      setAlertMessage({ type: 'error', text: result.error })
    } else {
      setAlertMessage({ type: 'success', text: 'Trip has been officially cancelled.' })
    }
    setCancelConfirmId(null)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  function openComplete(trip: Trip) {
    setCompletingTrip(trip)
    setCompleteForm({ actualDistanceKm: String(trip.plannedDistanceKm), fuelConsumedLiters: '' })
    setCompleteError('')
  }

  function handleComplete() {
    if (!completingTrip) return
    const result = completeTrip(completingTrip.id, Number(completeForm.actualDistanceKm), Number(completeForm.fuelConsumedLiters))
    if (!result.ok) {
      setCompleteError(result.error)
      return
    }
    setAlertMessage({ type: 'success', text: 'Trip successfully marked as completed!' })
    setCompletingTrip(null)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Trip Management"
        subtitle="Manage dispatch states, track active routes, and complete operational cargo delivery lifecycles."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              filename="trip-registry"
              title="Trip Management"
              headers={['Manifest ID', 'Source', 'Destination', 'Vehicle', 'Driver', 'Cargo (kg)', 'Planned (km)', 'Actual (km)', 'Fuel (L)', 'Status']}
              rows={sorted.map((t) => [
                t.id,
                t.source,
                t.destination,
                vehicleLabel(t.vehicleId),
                driverLabel(t.driverId),
                t.cargoWeightKg,
                t.plannedDistanceKm,
                t.actualDistanceKm ?? '-',
                t.fuelConsumedLiters ?? '-',
                t.status,
              ])}
            />
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Create Trip</span>
            </Button>
          </div>
        }
      />

      {/* Non-blocking feedback notification */}
      {alertMessage && (
        <div
          className={`rounded-xl px-4 py-3.5 text-xs font-bold border flex items-center justify-between transition-all shadow-sm ${
            alertMessage.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>{alertMessage.text}</span>
          </div>
          <button onClick={() => setAlertMessage(null)} className="text-current opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex gap-2 bg-slate-100/70 p-1.5 rounded-xl">
          {(['All', 'Draft', 'Dispatched', 'Completed', 'Cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                statusFilter === tab
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:bg-white/40 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState>
          <p className="font-bold text-slate-500 mb-1">No trips matching status</p>
          <p className="text-xs text-slate-400">There are currently no trip records found in this scope.</p>
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0 border border-slate-100 shadow-sm shadow-slate-100/30">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Active Route Details</th>
                <th className="px-6 py-4">Vehicle Used</th>
                <th className="px-6 py-4">Assigned Driver</th>
                <th className="px-6 py-4">Cargo Load</th>
                <th className="px-6 py-4">Distance Parameters</th>
                <th className="px-6 py-4">Dispatch Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Operational Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((t) => (
                <tr key={t.id} className="group hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm tracking-tight">{t.source}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      <span className="font-extrabold text-slate-900 text-sm tracking-tight">{t.destination}</span>
                    </div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                      Manifest: {t.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-700 bg-slate-100/60 rounded-lg px-2.5 py-1">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      {vehicleLabel(t.vehicleId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-black">
                        {driverLabel(t.driverId).charAt(0)}
                      </div>
                      <span>{driverLabel(t.driverId)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-700">
                      <Scale className="h-3.5 w-3.5 text-slate-400" />
                      {t.cargoWeightKg.toLocaleString()} kg
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="block font-bold text-slate-700 text-xs">
                      {formatDistance(t.actualDistanceKm ?? t.plannedDistanceKm)}
                    </span>
                    <span className="block text-[9px] font-semibold text-slate-400 uppercase">
                      {t.actualDistanceKm ? 'Actual Logged' : 'Estimated Route'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.status} />
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {t.status === 'Draft' && (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => handleDispatch(t.id)}
                              className="px-3 py-1 text-xs"
                            >
                              Dispatch
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setCancelConfirmId(t.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 text-xs"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {t.status === 'Dispatched' && (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => openComplete(t)}
                              className="px-3 py-1 text-xs"
                            >
                              Log Complete
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setCancelConfirmId(t.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 text-xs"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Manifest Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Trip Manifest">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Dispatch Source (Start)">
              <input className={inputClass} placeholder="e.g. Wareham Depot" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="Dispatch Destination (End)">
              <input className={inputClass} placeholder="e.g. NYC Port Authority" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </Field>
          </div>
          <Field label="Assign Registry Vehicle">
            <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select an available vehicle...</option>
              {dispatchableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} · {v.model} (max {v.maxLoadCapacityKg} kg)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assign Operator / Driver">
            <select className={inputClass} value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
              <option value="">Select an available driver...</option>
              {assignableDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.licenseCategory} (Safety {d.safetyScore}%)
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Cargo Cargo Weight (kg)">
              <input type="number" min="0" placeholder="e.g. 5000" className={inputClass} value={form.cargoWeightKg} onChange={(e) => setForm({ ...form, cargoWeightKg: e.target.value })} />
            </Field>
            <Field label="Planned Route Distance (km)">
              <input type="number" min="0" placeholder="e.g. 240" className={inputClass} value={form.plannedDistanceKm} onChange={(e) => setForm({ ...form, plannedDistanceKm: e.target.value })} />
            </Field>
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Save Manifest Draft</Button>
        </div>
      </Modal>

      {/* Complete Trip Logging Modal */}
      <Modal open={!!completingTrip} onClose={() => setCompletingTrip(null)} title="Complete Active Dispatch">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed mb-2">
            Record exact physical route statistics for billing integration, fuel metrics, and ROI calculation.
          </p>
          <Field label="Actual Odometer Distance Traveled (km)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={completeForm.actualDistanceKm}
              onChange={(e) => setCompleteForm({ ...completeForm, actualDistanceKm: e.target.value })}
            />
          </Field>
          <Field label="Actual Fuel Consumed (liters)">
            <input
              type="number"
              min="0"
              placeholder="e.g. 45"
              className={inputClass}
              value={completeForm.fuelConsumedLiters}
              onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumedLiters: e.target.value })}
            />
          </Field>
        </div>
        <ErrorText>{completeError}</ErrorText>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCompletingTrip(null)}>
            Cancel
          </Button>
          <Button onClick={handleComplete}>Log Closed Trip</Button>
        </div>
      </Modal>

      {/* Custom Confirmation Modal for Cancelling Trip */}
      <Modal open={!!cancelConfirmId} onClose={() => setCancelConfirmId(null)} title="Cancel Active Trip">
        <div className="text-center p-2 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
            <XCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">Are you sure you want to cancel this trip?</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            This action will discharge the associated vehicle and driver back into the available fleet registries immediately.
          </p>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCancelConfirmId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => cancelConfirmId && handleCancel(cancelConfirmId)}>
            Confirm Cancellation
          </Button>
        </div>
      </Modal>
    </div>
  )
}
