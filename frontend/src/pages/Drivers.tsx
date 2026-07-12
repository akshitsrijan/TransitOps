import { useMemo, useState } from 'react'
import type { Driver, DriverStatus } from '../types'
import { isLicenseExpired, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'
import ExportButtons from '../components/ExportButtons'
import { Search, Plus, Edit2, Trash2, ShieldAlert, Calendar, Phone, Star } from 'lucide-react'

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter(
      (d) => d.name.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q),
    )
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
    setAlertMessage({
      type: 'success',
      text: editingId ? 'Driver details updated!' : 'Driver successfully registered!',
    })
    setModalOpen(false)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  function handleDelete(id: string) {
    const result = deleteDriver(id)
    if (!result.ok) {
      setAlertMessage({ type: 'error', text: result.error })
    } else {
      setAlertMessage({ type: 'success', text: 'Driver deleted successfully.' })
    }
    setDeleteConfirmId(null)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  // Get score color styling
  const getScoreBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (score >= 75) return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-red-50 text-red-700 border-red-100'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Driver Management"
        subtitle="Track active operator registration, safety rankings, and compliance statuses."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              filename="driver-registry"
              title="Driver Management"
              headers={['Name', 'License No.', 'Category', 'License Expiry', 'Contact', 'Safety Score (%)', 'Status']}
              rows={filtered.map((d) => [d.name, d.licenseNumber, d.licenseCategory, d.licenseExpiry, d.contact, d.safetyScore, d.status])}
            />
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Driver</span>
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

      {/* Search Input */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by driver name or license registry ID..."
          className={`${inputClass} pl-10`}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          <p className="font-bold text-slate-500 mb-1">No operators found</p>
          <p className="text-xs text-slate-400">Try adjusting your search filters or input spelling.</p>
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0 border border-slate-100 shadow-sm shadow-slate-100/30">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Driver Profile</th>
                <th className="px-6 py-4">License No.</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">License Expiry</th>
                <th className="px-6 py-4">Safety Score</th>
                <th className="px-6 py-4">Duty Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((d) => {
                const expired = isLicenseExpired(d)
                const initials = d.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                return (
                  <tr key={d.id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
                          {initials}
                        </div>
                        <div>
                          <span className="block font-extrabold text-slate-900 text-sm tracking-tight">
                            {d.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {d.contact || 'No phone'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700 text-xs font-semibold">
                      {d.licenseNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {d.licenseCategory || 'C'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-xs font-semibold ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                          {d.licenseExpiry}
                        </span>
                        {expired ? (
                          <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest flex items-center gap-0.5 mt-0.5">
                            <ShieldAlert className="h-3 w-3 inline" /> Expired Blocked
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-0.5 mt-0.5">
                            <Calendar className="h-3 w-3 inline" /> Valid Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs font-extrabold ${getScoreBadgeClass(d.safetyScore)}`}>
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {d.safetyScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            title="Edit operator"
                            onClick={() => openEdit(d)}
                            className="h-8 w-8 p-0 rounded-lg"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            title="Delete operator"
                            onClick={() => setDeleteConfirmId(d.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Driver Operator' : 'Register New Operator'}>
        <div className="space-y-4">
          <Field label="Full Name">
            <input className={inputClass} placeholder="e.g. Mitchell Ross" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="License Identification ID">
              <input className={inputClass} placeholder="e.g. DL-40192A" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
            </Field>
            <Field label="License Class / Category">
              <input className={inputClass} placeholder="e.g. CDL Class A" value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Expiration Date">
              <input type="date" className={inputClass} value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
            </Field>
            <Field label="Contact Phone / Email">
              <input className={inputClass} placeholder="e.g. +1 555-0193" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Safety Compliance Score (%)">
              <input type="number" min="0" max="100" className={inputClass} value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: e.target.value })} />
            </Field>
            <Field label="Operator Status">
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
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingId ? 'Save Configuration' : 'Confirm Registration'}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Confirm Operator Release">
        <div className="text-center p-2 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
            <Trash2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-900">Release driver from service registry?</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            This operator will be deregistered immediately. All active dispatch associations will require replacement assignments.
          </p>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
            Deregister Operator
          </Button>
        </div>
      </Modal>
    </div>
  )
}
