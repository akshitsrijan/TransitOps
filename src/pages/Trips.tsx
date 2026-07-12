import { useMemo, useState } from 'react'
import type { Trip, TripStatus } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'

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
  const { trips, vehicles, drivers, dispatchableVehicles, assignableDrivers, createTrip, dispatchTrip, completeTrip, cancelTrip } = useData()
  const { hasRole } = useAuth()
  const canEdit = hasRole('Fleet Manager', 'Driver')

  const [statusFilter, setStatusFilter] = useState<'All' | TripStatus>('All')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null)
  const [completeForm, setCompleteForm] = useState(emptyCompleteForm)
  const [completeError, setCompleteError] = useState('')

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
      source: form.source,
      destination: form.destination,
      vehicleId: form.vehicleId,
      driverId: form.driverId,
      cargoWeightKg: Number(form.cargoWeightKg),
      plannedDistanceKm: Number(form.plannedDistanceKm),
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setCreateOpen(false)
  }

  function handleDispatch(id: string) {
    const result = dispatchTrip(id)
    if (!result.ok) alert(result.error)
  }

  function handleCancel(id: string) {
    if (!confirm('Cancel this trip?')) return
    const result = cancelTrip(id)
    if (!result.ok) alert(result.error)
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
    setCompletingTrip(null)
  }

  return (
    <div>
      <PageHeader
        title="Trip Management"
        subtitle="Draft → Dispatched → Completed / Cancelled."
        action={canEdit && <Button onClick={openCreate}>+ Create Trip</Button>}
      />

      <div className="mb-4 flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | TripStatus)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
          {['All', 'Draft', 'Dispatched', 'Completed', 'Cancelled'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <EmptyState>No trips found.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-2.5">Route</th>
                <th className="px-4 py-2.5">Vehicle</th>
                <th className="px-4 py-2.5">Driver</th>
                <th className="px-4 py-2.5">Cargo</th>
                <th className="px-4 py-2.5">Distance</th>
                <th className="px-4 py-2.5">Status</th>
                {canEdit && <th className="px-4 py-2.5"></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">
                    {t.source} → {t.destination}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{vehicleLabel(t.vehicleId)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{driverLabel(t.driverId)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{t.cargoWeightKg} kg</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {t.actualDistanceKm ? `${t.actualDistanceKm} km (actual)` : `${t.plannedDistanceKm} km (planned)`}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={t.status} />
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        {t.status === 'Draft' && (
                          <>
                            <Button variant="ghost" onClick={() => handleDispatch(t.id)}>
                              Dispatch
                            </Button>
                            <Button variant="ghost" onClick={() => handleCancel(t.id)}>
                              Cancel
                            </Button>
                          </>
                        )}
                        {t.status === 'Dispatched' && (
                          <>
                            <Button variant="ghost" onClick={() => openComplete(t)}>
                              Complete
                            </Button>
                            <Button variant="ghost" onClick={() => handleCancel(t.id)}>
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Trip">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <input className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="Destination">
              <input className={inputClass} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </Field>
          </div>
          <Field label="Vehicle">
            <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select an available vehicle...</option>
              {dispatchableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} · {v.model} (max {v.maxLoadCapacityKg} kg)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Driver">
            <select className={inputClass} value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
              <option value="">Select an available driver...</option>
              {assignableDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.licenseCategory}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo Weight (kg)">
              <input type="number" min="0" className={inputClass} value={form.cargoWeightKg} onChange={(e) => setForm({ ...form, cargoWeightKg: e.target.value })} />
            </Field>
            <Field label="Planned Distance (km)">
              <input type="number" min="0" className={inputClass} value={form.plannedDistanceKm} onChange={(e) => setForm({ ...form, plannedDistanceKm: e.target.value })} />
            </Field>
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Trip</Button>
        </div>
      </Modal>

      <Modal open={!!completingTrip} onClose={() => setCompletingTrip(null)} title="Complete Trip">
        <div className="space-y-3">
          <Field label="Final Odometer Distance (km)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={completeForm.actualDistanceKm}
              onChange={(e) => setCompleteForm({ ...completeForm, actualDistanceKm: e.target.value })}
            />
          </Field>
          <Field label="Fuel Consumed (liters)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={completeForm.fuelConsumedLiters}
              onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumedLiters: e.target.value })}
            />
          </Field>
        </div>
        <ErrorText>{completeError}</ErrorText>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCompletingTrip(null)}>
            Cancel
          </Button>
          <Button onClick={handleComplete}>Mark Completed</Button>
        </div>
      </Modal>
    </div>
  )
}
