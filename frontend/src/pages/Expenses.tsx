import { useMemo, useState } from 'react'
import type { ExpenseCategory } from '../types'
import { useData } from '../context/DataContext'
import { useSettings } from '../context/SettingsContext'
import { Button, Card, EmptyState, ErrorText, Field, Modal, PageHeader, inputClass } from '../components/ui'
import ExportButtons from '../components/ExportButtons'
import { Fuel, Receipt, Truck, Layers } from 'lucide-react'

const categories: ExpenseCategory[] = ['Toll', 'Maintenance', 'Insurance', 'Fine', 'Other']

const emptyFuelForm = { vehicleId: '', liters: '', cost: '', date: new Date().toISOString().slice(0, 10) }
const emptyExpenseForm = { vehicleId: '', category: 'Toll' as ExpenseCategory, amount: '', date: new Date().toISOString().slice(0, 10), notes: '' }

export default function Expenses() {
  const { vehicles, fuelLogs, expenses, addFuelLog, addExpense } = useData()
  const { formatMoney } = useSettings()

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
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Fuel & Cost Logs"
        subtitle="Manage regular expenses and fuel top-ups to maintain precise operational ROI stats."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openFuelModal} className="flex items-center gap-1.5">
              <Fuel className="h-4 w-4 text-indigo-600" />
              <span>Log Fuel</span>
            </Button>
            <Button onClick={openExpenseModal} className="flex items-center gap-1.5">
              <Receipt className="h-4 w-4" />
              <span>Log Expense</span>
            </Button>
          </div>
        }
      />

      {/* cost board */}
      <Card>
        <div className="flex items-center gap-2 mb-5 border-b border-slate-50 pb-3">
          <Layers className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Operational Fleet Overhead Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-4">Vehicle Identity</th>
                <th className="py-3 pr-4">Total Fuel Cost</th>
                <th className="py-3 pr-4">Other Operating Overhead</th>
                <th className="py-3 pr-4 text-right">Combined Expenses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vehicles.map((v) => {
                const c = costByVehicle.get(v.id) ?? { fuel: 0, other: 0 }
                return (
                  <tr key={v.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5 font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/20 text-xs">
                        <Truck className="h-3.5 w-3.5 text-slate-500" />
                        {v.registrationNumber}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-semibold text-slate-700 text-xs">
                      {formatMoney(c.fuel)}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-slate-700 text-xs">
                      {formatMoney(c.other)}
                    </td>
                    <td className="py-4 pr-4 font-black text-slate-900 text-right text-xs">
                      {formatMoney(c.fuel + c.other)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dual listings layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fuel Logs Section */}
        <Card className="p-0 overflow-hidden border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Recent Fuel Logs</h2>
            </div>
            <ExportButtons
              compact
              filename="fuel-logs"
              title="Fuel Logs"
              headers={['Vehicle', 'Volume (L)', 'Cost', 'Date']}
              rows={sortedFuel.map((f) => [vehicleLabel(f.vehicleId), f.liters, f.cost, f.date])}
            />
          </div>

          {sortedFuel.length === 0 ? (
            <div className="py-12">
              <EmptyState>No fuel receipts registered yet.</EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/20">
                    <th className="px-5 py-3">Vehicle</th>
                    <th className="px-5 py-3">Volume (L)</th>
                    <th className="px-5 py-3">Receipt Cost</th>
                    <th className="px-5 py-3 text-right">Fill Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedFuel.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{vehicleLabel(f.vehicleId)}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">{f.liters} L</td>
                      <td className="px-5 py-3.5 font-extrabold text-slate-800">{formatMoney(f.cost)}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-400">{f.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Other Expenses Logs Section */}
        <Card className="p-0 overflow-hidden border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Other Expenses Logs</h2>
            </div>
            <ExportButtons
              compact
              filename="expense-logs"
              title="Expense Logs"
              headers={['Vehicle', 'Category', 'Amount', 'Date', 'Notes']}
              rows={sortedExpenses.map((e) => [vehicleLabel(e.vehicleId), e.category, e.amount, e.date, e.notes ?? ''])}
            />
          </div>

          {sortedExpenses.length === 0 ? (
            <div className="py-12">
              <EmptyState>No other expenses registered.</EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/20">
                    <th className="px-5 py-3">Vehicle</th>
                    <th className="px-5 py-3">Expense Category</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3 text-right">Log Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        <div>
                          <span className="block">{vehicleLabel(e.vehicleId)}</span>
                          {e.notes && <span className="block text-[10px] font-medium text-slate-400 mt-0.5">{e.notes}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-[10px] text-slate-500">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-slate-800">{formatMoney(e.amount)}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-400">{e.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Fuel top-up log modal */}
      <Modal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Log Fleet Fuel Receipt">
        <div className="space-y-4">
          <Field label="Target Fleet Vehicle">
            <select className={inputClass} value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })}>
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} ({v.model})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Fuel Volume (Liters)">
              <input type="number" min="0" placeholder="e.g. 60" className={inputClass} value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} />
            </Field>
            <Field label="Total Reciept Cost ($)">
              <input type="number" min="0" placeholder="e.g. 110" className={inputClass} value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} />
            </Field>
          </div>
          <Field label="Receipt Purchase Date">
            <input type="date" className={inputClass} value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} />
          </Field>
        </div>
        <ErrorText>{fuelError}</ErrorText>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFuelModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleFuelSubmit}>Log Fuel Receipt</Button>
        </div>
      </Modal>

      {/* General expense log modal */}
      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Log Miscellaneous Overhead">
        <div className="space-y-4">
          <Field label="Target Vehicle Association">
            <select className={inputClass} value={expenseForm.vehicleId} onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })}>
              <option value="">Select associated vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Overhead Category">
              <select className={inputClass} value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Total Amount ($)">
              <input type="number" min="0" placeholder="e.g. 45" className={inputClass} value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </Field>
          </div>
          <Field label="Date Occurred">
            <input type="date" className={inputClass} value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          </Field>
          <Field label="Overhead Notes / Invoice Reference (optional)">
            <input className={inputClass} placeholder="e.g. Toll booth ticket #402" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
          </Field>
        </div>
        <ErrorText>{expenseError}</ErrorText>
        <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setExpenseModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExpenseSubmit}>Log Operational Expense</Button>
        </div>
      </Modal>
    </div>
  )
}
