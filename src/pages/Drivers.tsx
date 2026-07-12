import { useMemo, useState } from 'react'
import type { Driver, DriverStatus } from '../types'
import { isLicenseExpired, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'

const emptyForm = {
  name: '',
  licenseNumber: '',
  licenseCategory: '',
  licenseExpiry: '',
  contact: '',
  safetyScore: '90',
  status: 'Available' as DriverStatus,
}

export default function Drivers() {
  const { drivers, addDriver, updateDriver, deleteDriver } = useData()
  const { hasRole } = useAuth()
  const canEdit = hasRole('Fleet Manager', 'Safety Officer')

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter((d) => d.name.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q))
  }, [drivers, search])

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(d: Driver) {
    setForm({
      name: d.name,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiry: d.licenseExpiry,
      contact: d.contact,
      safetyScore: String(d.safetyScore),
      status: d.status,
    })
    setEditingId(d.id)
    setError('')
    setModalOpen(true)
  }

  function handleSubmit() {
    const payload = {
      name: form.name.trim(),
      licenseNumber: form.licenseNumber.trim(),
      licenseCategory: form.licenseCategory.trim(),
      licenseExpiry: form.licenseExpiry,
      contact: form.contact.trim(),
      safetyScore: Number(form.safetyScore),
      status: form.status,
    }
    if (!payload.name || !payload.licenseNumber || !payload.licenseExpiry) {
      setError('Name, license number, and license expiry are required.')
      return
    }
    const result = editingId ? updateDriver(editingId, payload) : addDriver(payload)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setModalOpen(false)
  }

  function handleDelete(id: string) {
    const result = deleteDriver(id)
    if (!result.ok) alert(result.error)
  }

  return (
    <div>
      <PageHeader
        title="Driver Management"
        subtitle="Track license compliance, safety scores, and availability."
        action={canEdit && <Button onClick={openCreate}>+ Add Driver</Button>}
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or license number..."
        className={`${inputClass} mb-4 max-w-sm`}
      />

      {filtered.length === 0 ? (
        <EmptyState>No drivers match your search.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">License</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Expiry</th>
                <th className="px-4 py-2.5">Safety Score</th>
                <th className="px-4 py-2.5">Status</th>
                {canEdit && <th className="px-4 py-2.5"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const expired = isLicenseExpired(d)
                return (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{d.name}</td>
                    <td className="px-4 py-2.5 text-slate-700">{d.licenseNumber}</td>
                    <td className="px-4 py-2.5 text-slate-700">{d.licenseCategory}</td>
                    <td className={`px-4 py-2.5 ${expired ? 'font-medium text-red-600' : 'text-slate-700'}`}>
                      {d.licenseExpiry}
                      {expired && ' (expired)'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{d.safetyScore}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={d.status} />
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => openEdit(d)}>
                            Edit
                          </Button>
                          <Button variant="ghost" onClick={() => handleDelete(d.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Driver' : 'Add Driver'}>
        <div className="space-y-3">
          <Field label="Name">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="License Number">
              <input className={inputClass} value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
            </Field>
            <Field label="License Category">
              <input className={inputClass} value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="License Expiry">
              <input type="date" className={inputClass} value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
            </Field>
            <Field label="Contact">
              <input className={inputClass} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Safety Score">
              <input type="number" min="0" max="100" className={inputClass} value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DriverStatus })}>
                <option>Available</option>
                <option>On Trip</option>
                <option>Off Duty</option>
                <option>Suspended</option>
              </select>
            </Field>
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingId ? 'Save Changes' : 'Add Driver'}</Button>
        </div>
      </Modal>
    </div>
  )
}
