import { useMemo, useState } from 'react'
import type { ExpenseCategory } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, inputClass } from '../components/ui'

const categories: ExpenseCategory[] = ['Toll', 'Maintenance', 'Insurance', 'Fine', 'Other']

const emptyFuelForm = { vehicleId: '', liters: '', cost: '', date: new Date().toISOString().slice(0, 10) }
const emptyExpenseForm = { vehicleId: '', category: 'Toll' as ExpenseCategory, amount: '', date: new Date().toISOString().slice(0, 10), notes: '' }

export default function Expenses() {
  const { vehicles, fuelLogs, expenses, addFuelLog, addExpense } = useData()
  const { hasRole } = useAuth()
  const canEdit = hasRole('Fleet Manager', 'Financial Analyst')

  const [fuelModalOpen, setFuelModalOpen] = useState(false)
  const [fuelForm, setFuelForm] = useState(emptyFuelForm)
  const [fuelError, setFuelError] = useState('')

  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm)
  const [expenseError, setExpenseError] = useState('')

  function vehicleLabel(id: string) {
    return vehicles.find((v) => v.id === id)?.registrationNumber ?? 'Unknown'
  }

  const costByVehicle = useMemo(() => {
    const map = new Map<string, { fuel: number; other: number }>()
    for (const v of vehicles) map.set(v.id, { fuel: 0, other: 0 })
    for (const f of fuelLogs) {
      const entry = map.get(f.vehicleId)
      if (entry) entry.fuel += f.cost
    }
    for (const e of expenses) {
      const entry = map.get(e.vehicleId)
      if (entry) entry.other += e.amount
    }
    return map
  }, [vehicles, fuelLogs, expenses])

  function openFuelModal() {
    setFuelForm(emptyFuelForm)
    setFuelError('')
    setFuelModalOpen(true)
  }
  function handleFuelSubmit() {
    const result = addFuelLog({
      vehicleId: fuelForm.vehicleId,
      liters: Number(fuelForm.liters),
      cost: Number(fuelForm.cost),
      date: fuelForm.date,
    })
    if (!result.ok) {
      setFuelError(result.error)
      return
    }
    setFuelModalOpen(false)
  }

  function openExpenseModal() {
    setExpenseForm(emptyExpenseForm)
    setExpenseError('')
    setExpenseModalOpen(true)
  }
  function handleExpenseSubmit() {
    const result = addExpense({
      vehicleId: expenseForm.vehicleId,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      notes: expenseForm.notes.trim() || undefined,
    })
    if (!result.ok) {
      setExpenseError(result.error)
      return
    }
    setExpenseModalOpen(false)
  }

  const sortedFuel = [...fuelLogs].sort((a, b) => b.date.localeCompare(a.date))
  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader
        title="Fuel & Expense Management"
        subtitle="Auto-computes total operational cost (Fuel + Maintenance) per vehicle."
        action={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openFuelModal}>
                + Log Fuel
              </Button>
              <Button onClick={openExpenseModal}>+ Log Expense</Button>
            </div>
          )
        }
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Operational Cost by Vehicle</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-2 pr-3">Vehicle</th>
              <th className="py-2 pr-3">Fuel Cost</th>
              <th className="py-2 pr-3">Other Expenses</th>
              <th className="py-2 pr-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const c = costByVehicle.get(v.id) ?? { fuel: 0, other: 0 }
              return (
                <tr key={v.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-900">{v.registrationNumber}</td>
                  <td className="py-2 pr-3 text-slate-700">${c.fuel.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-slate-700">${c.other.toLocaleString()}</td>
                  <td className="py-2 pr-3 font-medium text-slate-900">${(c.fuel + c.other).toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Fuel Logs</h2>
          {sortedFuel.length === 0 ? (
            <EmptyState>No fuel logs yet.</EmptyState>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-2">Vehicle</th>
                  <th className="px-4 py-2">Liters</th>
                  <th className="px-4 py-2">Cost</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {sortedFuel.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-700">{vehicleLabel(f.vehicleId)}</td>
                    <td className="px-4 py-2 text-slate-700">{f.liters} L</td>
                    <td className="px-4 py-2 text-slate-700">${f.cost}</td>
                    <td className="px-4 py-2 text-slate-700">{f.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-0">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Expenses</h2>
          {sortedExpenses.length === 0 ? (
            <EmptyState>No expenses logged yet.</EmptyState>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="px-4 py-2">Vehicle</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-700">{vehicleLabel(e.vehicleId)}</td>
                    <td className="px-4 py-2 text-slate-700">{e.category}</td>
                    <td className="px-4 py-2 text-slate-700">${e.amount}</td>
                    <td className="px-4 py-2 text-slate-700">{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Modal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Log Fuel">
        <div className="space-y-3">
          <Field label="Vehicle">
            <select className={inputClass} value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })}>
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Liters">
              <input type="number" min="0" className={inputClass} value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} />
            </Field>
            <Field label="Cost">
              <input type="number" min="0" className={inputClass} value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} />
            </Field>
          </div>
          <Field label="Date">
            <input type="date" className={inputClass} value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} />
          </Field>
        </div>
        <ErrorText>{fuelError}</ErrorText>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFuelModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleFuelSubmit}>Log Fuel</Button>
        </div>
      </Modal>

      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Log Expense">
        <div className="space-y-3">
          <Field label="Vehicle">
            <select className={inputClass} value={expenseForm.vehicleId} onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })}>
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className={inputClass} value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input type="number" min="0" className={inputClass} value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </Field>
          </div>
          <Field label="Date">
            <input type="date" className={inputClass} value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          </Field>
          <Field label="Notes (optional)">
            <input className={inputClass} value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
          </Field>
        </div>
        <ErrorText>{expenseError}</ErrorText>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setExpenseModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExpenseSubmit}>Log Expense</Button>
        </div>
      </Modal>
    </div>
  )
}
