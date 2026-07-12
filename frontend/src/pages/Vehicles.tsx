import { useMemo, useState } from 'react'
import type { Vehicle, VehicleStatus } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'
import { Search, Plus, Edit2, Trash2, ShieldAlert, MapPin, Layers } from 'lucide-react'

const emptyForm = {
  registrationNumber: '',
  model: '',
  type: 'Van',
  maxLoadCapacityKg: '',
  odometerKm: '',
  acquisitionCost: '',
  status: 'Available' as VehicleStatus,
  region: '',
}

export default function Vehicles() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useData()
  const { hasRole } = useAuth()
  const { settings, formatDistance } = useSettings()
  const canEdit = hasRole('Fleet Manager')

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q),
    )
  }, [vehicles, search])

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(v: Vehicle) {
    setForm({
      registrationNumber: v.registrationNumber,
      model: v.model,
      type: v.type,
      maxLoadCapacityKg: String(v.maxLoadCapacityKg),
      odometerKm: String(v.odometerKm),
      acquisitionCost: String(v.acquisitionCost),
      status: v.status,
      region: v.region,
    })
    setEditingId(v.id)
    setError('')
    setModalOpen(true)
  }

  function handleSubmit() {
    const payload = {
      registrationNumber: form.registrationNumber.trim(),
      model: form.model.trim(),
      type: form.type.trim(),
      maxLoadCapacityKg: Number(form.maxLoadCapacityKg),
      odometerKm: Number(form.odometerKm),
      acquisitionCost: Number(form.acquisitionCost),
      status: form.status,
      region: form.region.trim(),
    }
    if (!payload.registrationNumber || !payload.model || !payload.region) {
      setError('Registration number, model, and region are required.')
      return
    }
    const result = editingId ? updateVehicle(editingId, payload) : addVehicle(payload)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAlertMessage({
      type: 'success',
      text: editingId ? 'Vehicle updated successfully!' : 'Vehicle registered successfully!',
    })
    setModalOpen(false)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  function handleDelete(id: string) {
    const result = deleteVehicle(id)
    if (!result.ok) {
      setAlertMessage({ type: 'error', text: result.error })
    } else {
      setAlertMessage({ type: 'success', text: 'Vehicle deleted from registry.' })
    }
    setDeleteConfirmId(null)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Vehicle Registry"
        subtitle="Manage fleet load parameters, regions, and active dispatch availability."
        action={
          canEdit && (
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Vehicle</span>
            </Button>
          )
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

      {/* Modern Search Field */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by registration plate, model name, or dispatch region..."
          className={`${inputClass} pl-10`}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          <p className="font-bold text-slate-500 mb-1">No matches found</p>
          <p className="text-xs text-slate-400">Try adjusting your spelling or region search criteria.</p>
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0 border border-slate-100 shadow-sm shadow-slate-100/30">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Vehicle Details</th>
                <th className="px-6 py-4">Configuration Type</th>
                <th className="px-6 py-4">Max Capacity</th>
                <th className="px-6 py-4">Mileage</th>
                <th className="px-6 py-4">Region Assigned</th>
                <th className="px-6 py-4">Availability</th>
                {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((v) => (
                <tr key={v.id} className="group hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold border border-slate-200/50">
                        {v.type.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span className="block font-extrabold text-slate-900 text-sm tracking-tight">
                          {v.registrationNumber}
                        </span>
                        <span className="block text-xs text-slate-400 font-semibold">{v.model}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-700 bg-slate-100/60 rounded-lg px-2.5 py-1">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      {v.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 text-xs">
                    {v.maxLoadCapacityKg.toLocaleString()} kg
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 text-xs">
                    {formatDistance(v.odometerKm)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {v.region}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={v.status} />
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          title="Edit vehicle details"
                          onClick={() => openEdit(v)}
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          title="Delete vehicle"
                          onClick={() => setDeleteConfirmId(v.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Edit/Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Vehicle Details' : 'Register New Fleet Vehicle'}>
        <div className="space-y-4">
          <Field label="Registration License Plate">
            <input className={inputClass} placeholder="e.g. TX-942-AP" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
          </Field>
          <Field label="Manufacturer & Model Name">
            <input className={inputClass} placeholder="e.g. Ford Transit Cargo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Vehicle Class/Type">
              <input className={inputClass} placeholder="e.g. Van, Truck" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </Field>
            <Field label="Operating Depot/Region">
              <select className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                <option value="">Select a depot...</option>
                {settings.depots.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                {/* Keep a legacy region selectable when editing a vehicle whose depot was removed */}
                {form.region && !settings.depots.includes(form.region) && (
                  <option value={form.region}>{form.region} (legacy)</option>
                )}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Max Payload Capacity (kg)">
              <input type="number" min="0" className={inputClass} value={form.maxLoadCapacityKg} onChange={(e) => setForm({ ...form, maxLoadCapacityKg: e.target.value })} />
            </Field>
            <Field label="Current Odometer (km)">
              <input type="number" min="0" className={inputClass} value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Acquisition Cost ($)">
              <input type="number" min="0" className={inputClass} value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} />
            </Field>
            <Field label="Initial Fleet Status">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}>
                <option>Available</option>
                <option>On Trip</option>
                <option>In Shop</option>
                <option>Retired</option>
              </select>
            </Field>
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingId ? 'Save Configuration' : 'Complete Registration'}</Button>
        </div>
      </Modal>

      {/* Non-blocking Delete Confirmation Modal */}
      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Confirm Deletion">
        <div className="text-center p-2 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
            <Trash2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">Are you sure you want to remove this vehicle?</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            This action cannot be undone. Removing a vehicle deletes all past log links associated with this specific registry item.
          </p>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
            Delete Vehicle
          </Button>
        </div>
      </Modal>
    </div>
  )
}
