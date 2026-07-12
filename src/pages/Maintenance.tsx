import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'

const emptyForm = { vehicleId: '', description: '', cost: '' }

export default function Maintenance() {
  const { maintenanceLogs, vehicles, addMaintenanceLog, closeMaintenanceLog } = useData()
  const { hasRole } = useAuth()
  const canEdit = hasRole('Fleet Manager')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  function vehicleLabel(id: string) {
    return vehicles.find((v) => v.id === id)?.registrationNumber ?? 'Unknown'
  }

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function handleSubmit() {
    const result = addMaintenanceLog({ vehicleId: form.vehicleId, description: form.description, cost: Number(form.cost) })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setModalOpen(false)
  }

  function handleClose(id: string) {
    const result = closeMaintenanceLog(id)
    if (!result.ok) alert(result.error)
  }

  const sorted = [...maintenanceLogs].sort((a, b) => b.openedAt.localeCompare(a.openedAt))

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Opening an active log sets the vehicle to In Shop and removes it from dispatch."
        action={canEdit && <Button onClick={openCreate}>+ Log Maintenance</Button>}
      />

      {sorted.length === 0 ? (
        <EmptyState>No maintenance records yet.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-4 py-2.5">Vehicle</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Cost</th>
                <th className="px-4 py-2.5">Opened</th>
                <th className="px-4 py-2.5">Status</th>
                {canEdit && <th className="px-4 py-2.5"></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{vehicleLabel(m.vehicleId)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{m.description}</td>
                  <td className="px-4 py-2.5 text-slate-700">${m.cost.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-slate-700">{new Date(m.openedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={m.status} />
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      {m.status === 'Active' && (
                        <Button variant="ghost" onClick={() => handleClose(m.id)}>
                          Close
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Maintenance">
        <div className="space-y-3">
          <Field label="Vehicle">
            <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} · {v.model}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Oil change" />
          </Field>
          <Field label="Cost">
            <input type="number" min="0" className={inputClass} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Log Maintenance</Button>
        </div>
      </Modal>
    </div>
  )
}
