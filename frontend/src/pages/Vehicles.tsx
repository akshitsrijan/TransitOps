import { useMemo, useState } from 'react'
import type { Vehicle, VehicleStatus } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'

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
  const canEdit = hasRole('Fleet Manager')

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) => v.registrationNumber.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.region.toLowerCase().includes(q),
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
    setModalOpen(false)
  }

  function handleDelete(id: string) {
    const result = deleteVehicle(id)
    if (!result.ok) alert(result.error)
  }

  return (
    <div>
      <PageHeader
        title="Vehicle Registry"
        subtitle="Manage fleet vehicles, capacity, and status."
        action={canEdit && <Button onClick={openCreate}>+ Add Vehicle</Button>}
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by registration, model, or region..."
        className={`${inputClass} mb-4 max-w-sm`}
      />

      {filtered.length === 0 ? (
        <EmptyState>No vehicles match your search.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-2.5">Registration</th>
                <th className="px-4 py-2.5">Model</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Max Load</th>
                <th className="px-4 py-2.5">Odometer</th>
                <th className="px-4 py-2.5">Region</th>
                <th className="px-4 py-2.5">Status</th>
                {canEdit && <th className="px-4 py-2.5"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{v.registrationNumber}</td>
                  <td className="px-4 py-2.5 text-slate-700">{v.model}</td>
                  <td className="px-4 py-2.5 text-slate-700">{v.type}</td>
                  <td className="px-4 py-2.5 text-slate-700">{v.maxLoadCapacityKg} kg</td>
                  <td className="px-4 py-2.5 text-slate-700">{v.odometerKm.toLocaleString()} km</td>
                  <td className="px-4 py-2.5 text-slate-700">{v.region}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={v.status} />
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => openEdit(v)}>
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => handleDelete(v.id)}>
                          Delete
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Vehicle' : 'Add Vehicle'}>
        <div className="space-y-3">
          <Field label="Registration Number">
            <input className={inputClass} value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
          </Field>
          <Field label="Model">
            <input className={inputClass} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <input className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </Field>
            <Field label="Region">
              <input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Load Capacity (kg)">
              <input type="number" min="0" className={inputClass} value={form.maxLoadCapacityKg} onChange={(e) => setForm({ ...form, maxLoadCapacityKg: e.target.value })} />
            </Field>
            <Field label="Odometer (km)">
              <input type="number" min="0" className={inputClass} value={form.odometerKm} onChange={(e) => setForm({ ...form, odometerKm: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Acquisition Cost">
              <input type="number" min="0" className={inputClass} value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} />
            </Field>
            <Field label="Status">
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
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingId ? 'Save Changes' : 'Add Vehicle'}</Button>
        </div>
      </Modal>
    </div>
  )
}
