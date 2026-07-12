import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, StatusBadge, inputClass } from '../components/ui'
import { Wrench, Plus, Calendar, DollarSign, ShieldAlert, Truck, ShieldCheck } from 'lucide-react'

const emptyForm = { vehicleId: '', description: '', cost: '' }

export default function Maintenance() {
  const { maintenanceLogs, vehicles, addMaintenanceLog, closeMaintenanceLog } = useData()
  const { hasRole } = useAuth()
  const canEdit = hasRole('Fleet Manager')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  function vehicleLabel(id: string) {
    return vehicles.find((v) => v.id === id)?.registrationNumber ?? 'Unknown'
  }

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function handleSubmit() {
    const result = addMaintenanceLog({
      vehicleId: form.vehicleId,
      description: form.description.trim(),
      cost: Number(form.cost),
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAlertMessage({ type: 'success', text: 'Vehicle dispatch status updated to (In Shop) and logged successfully.' })
    setModalOpen(false)
    setTimeout(() => setAlertMessage(null), 4000)
  }

  function handleClose(id: string) {
    const result = closeMaintenanceLog(id)
    if (!result.ok) {
      setAlertMessage({ type: 'error', text: result.error })
    } else {
      setAlertMessage({ type: 'success', text: 'Maintenance log closed! Vehicle marked as (Available).' })
    }
    setTimeout(() => setAlertMessage(null), 4000)
  }

  const sorted = [...maintenanceLogs].sort((a, b) => b.openedAt.localeCompare(a.openedAt))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fleet Maintenance Logs"
        subtitle="Track scheduled inspections, shop reports, and active compliance repairs."
        action={
          canEdit && (
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Log Maintenance</span>
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

      {sorted.length === 0 ? (
        <EmptyState>
          <Wrench className="h-8 w-8 text-slate-300 mb-1" />
          <p className="font-bold text-slate-500 mb-1">No maintenance records found</p>
          <p className="text-xs text-slate-400 font-medium">Your fleet has no history of active or closed maintenance entries.</p>
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0 border border-slate-100 shadow-sm shadow-slate-100/30">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Vehicle Registry</th>
                <th className="px-6 py-4">Issue / Description</th>
                <th className="px-6 py-4">Billed Cost</th>
                <th className="px-6 py-4">Opened Date</th>
                <th className="px-6 py-4">Log Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Shop Management</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((m) => (
                <tr key={m.id} className="group hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-700 bg-slate-100/60 rounded-lg px-2.5 py-1 border border-slate-200/20">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      {vehicleLabel(m.vehicleId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 text-xs">
                    {m.description}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center text-xs font-bold text-slate-800">
                      <DollarSign className="h-3.5 w-3.5 text-slate-400 -mr-0.5" />
                      {m.cost.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(m.openedAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={m.status} />
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      {m.status === 'Active' ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleClose(m.id)}
                          className="px-3.5 py-1 text-xs font-extrabold flex items-center gap-1.5 justify-end ml-auto"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Close Log</span>
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none pr-3">
                          Archived
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Maintenance Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Vehicle Maintenance">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Logging an active service item places the vehicle <strong>In Shop</strong>. It will be restricted from participating in new trips until this log is explicitly closed.
          </p>
          <Field label="Target Registry Vehicle">
            <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} · {v.model} ({v.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Maintenance Details & Scope">
            <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Scheduled oil change & brake fluid flush" />
          </Field>
          <Field label="Projected/Quoted Cost ($)">
            <input type="number" min="0" placeholder="e.g. 350" className={inputClass} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Dispatch to Shop</Button>
        </div>
      </Modal>
    </div>
  )
}
