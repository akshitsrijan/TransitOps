import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import {
  useSettings,
  ALL_PAGES,
  ALL_ROLES,
  CURRENCIES,
  type CurrencyCode,
  type DistanceUnit,
} from '../context/SettingsContext'
import { Button, Card, Field, PageHeader, inputClass } from '../components/ui'
import {
  ShieldCheck,
  Warehouse,
  Coins,
  Ruler,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  RotateCcw,
  Lock,
} from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const { vehicles, updateVehicle } = useData()
  const {
    settings,
    setPermission,
    setDepots,
    setCurrency,
    setDistanceUnit,
    resetSettings,
    formatMoney,
    formatDistance,
  } = useSettings()

  const [newDepot, setNewDepot] = useState('')
  const [editingDepot, setEditingDepot] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const isManager = user?.role === 'Fleet Manager'

  function addDepot() {
    const name = newDepot.trim()
    if (!name || settings.depots.includes(name)) return
    setDepots([...settings.depots, name])
    setNewDepot('')
  }

  function removeDepot(name: string) {
    setDepots(settings.depots.filter((d) => d !== name))
  }

  function commitRename(oldName: string) {
    const name = editValue.trim()
    setEditingDepot(null)
    if (!name || name === oldName || settings.depots.includes(name)) return
    setDepots(settings.depots.map((d) => (d === oldName ? name : d)))
    // Cascade the rename to vehicles assigned to this depot/region
    vehicles
      .filter((v) => v.region === oldName)
      .forEach((v) => {
        const { id, ...rest } = v
        updateVehicle(id, { ...rest, region: name })
      })
  }

  function vehiclesInDepot(name: string) {
    return vehicles.filter((v) => v.region === name).length
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure role privileges, depots, and regional display preferences."
        action={
          isManager && (
            <Button variant="secondary" onClick={resetSettings}>
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          )
        }
      />

      <div className="space-y-8">
        {/* ── RBAC Privilege Matrix ─────────────────────────────────── */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Role Privileges</h2>
          </div>
          <p className="mb-5 text-xs font-medium text-slate-500">
            Control which modules each role can access. Changes apply immediately across the app —
            sidebar links hide and direct URLs redirect for roles without access.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Module</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role} className="px-4 py-3 text-center">
                      {role}
                      {role === 'Fleet Manager' && (
                        <Lock className="ml-1 inline h-3 w-3 text-slate-300" aria-label="Locked - always full access" />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PAGES.map((page) => (
                  <tr key={page.key} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 pr-4 font-semibold text-slate-700">{page.label}</td>
                    {ALL_ROLES.map((role) => {
                      const locked = role === 'Fleet Manager'
                      const allowed = locked || (settings.permissions[role] ?? []).includes(page.key)
                      return (
                        <td key={role} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={allowed}
                            disabled={locked || !isManager}
                            onChange={(e) => setPermission(role, page.key, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                            aria-label={`${role} access to ${page.label}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] font-medium text-slate-400">
            <Lock className="mr-1 inline h-3 w-3" />
            Fleet Manager access is locked to prevent administrator lockout.
          </p>
        </Card>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ── Depot Management ──────────────────────────────────── */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Depots / Regions</h2>
            </div>
            <p className="mb-5 text-xs font-medium text-slate-500">
              Depot names appear in vehicle assignment and dashboard filters. Renaming a depot
              also updates every vehicle assigned to it.
            </p>

            <div className="space-y-2">
              {settings.depots.map((depot) => (
                <div
                  key={depot}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5"
                >
                  {isManager && editingDepot === depot ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(depot)
                          if (e.key === 'Escape') setEditingDepot(null)
                        }}
                        className={inputClass}
                        autoFocus
                      />
                      <button
                        onClick={() => commitRename(depot)}
                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                        aria-label="Save name"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingDepot(null)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                        aria-label="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-sm font-bold text-slate-800">{depot}</span>
                        <span className="ml-2 text-[11px] font-semibold text-slate-400">
                          {vehiclesInDepot(depot)} vehicle{vehiclesInDepot(depot) === 1 ? '' : 's'}
                        </span>
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingDepot(depot)
                              setEditValue(depot)
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Rename ${depot}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeDepot(depot)}
                            disabled={vehiclesInDepot(depot) > 0}
                            title={vehiclesInDepot(depot) > 0 ? 'Reassign its vehicles first' : 'Remove depot'}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            aria-label={`Remove ${depot}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {isManager && (
              <div className="mt-4 flex gap-2">
                <input
                  value={newDepot}
                  onChange={(e) => setNewDepot(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDepot()}
                  placeholder="New depot name (e.g. Central)"
                  className={inputClass}
                />
                <Button onClick={addDepot} disabled={!newDepot.trim()}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            )}
          </Card>

          {/* ── Regional Preferences ──────────────────────────────── */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Regional Preferences</h2>
            </div>
            <p className="mb-5 text-xs font-medium text-slate-500">
              Display units used across dashboards, reports, and expense views.
            </p>

            <div className="space-y-5">
              <Field label="Currency">
                <select
                  value={settings.currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  disabled={!isManager}
                  className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Ruler className="mr-1 inline h-3.5 w-3.5" />
                  Distance Unit
                </span>
                <div className="flex gap-2">
                  {(['km', 'mi'] as DistanceUnit[]).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setDistanceUnit(unit)}
                      disabled={!isManager}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed ${
                        settings.distanceUnit === unit
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-500'
                      }`}
                    >
                      {unit === 'km' ? 'Kilometers (km)' : 'Miles (mi)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Preview</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-500">Acquisition cost</span>
                  <span className="font-bold text-slate-800">{formatMoney(38000)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-500">Odometer reading</span>
                  <span className="font-bold text-slate-800">{formatDistance(42150)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
