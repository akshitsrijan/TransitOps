import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Role } from '../types'
import { loadFromStorage, saveToStorage } from '../lib/storage'

const SETTINGS_KEY = 'transitops.settings'

export type PageKey =
  | 'dashboard'
  | 'vehicles'
  | 'drivers'
  | 'trips'
  | 'maintenance'
  | 'expenses'
  | 'reports'

export const ALL_PAGES: { key: PageKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'trips', label: 'Trips' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'expenses', label: 'Fuel & Expenses' },
  { key: 'reports', label: 'Reports' },
]

export const ALL_ROLES: Role[] = ['Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst']

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED'
export type DistanceUnit = 'km' | 'mi'

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'AED', label: 'UAE Dirham (د.إ)' },
]

const KM_PER_MILE = 1.609344

export interface AppSettings {
  permissions: Record<Role, PageKey[]>
  depots: string[]
  currency: CurrencyCode
  distanceUnit: DistanceUnit
}

const ALL_PAGE_KEYS = ALL_PAGES.map((p) => p.key)

export const DEFAULT_SETTINGS: AppSettings = {
  // Fleet Manager always has full access (locked in the Settings UI to avoid lockout).
  permissions: {
    'Fleet Manager': [...ALL_PAGE_KEYS],
    Driver: ['dashboard', 'vehicles', 'trips'],
    'Safety Officer': ['dashboard', 'drivers', 'trips', 'maintenance'],
    'Financial Analyst': ['dashboard', 'expenses', 'reports', 'maintenance'],
  },
  depots: ['North', 'South', 'East', 'West'],
  currency: 'USD',
  distanceUnit: 'km',
}

function loadSettings(): AppSettings {
  const stored = loadFromStorage<Partial<AppSettings>>(SETTINGS_KEY, {})
  // Merge with defaults so newly added fields never come back undefined
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    permissions: { ...DEFAULT_SETTINGS.permissions, ...(stored.permissions ?? {}) },
  }
}

interface SettingsContextValue {
  settings: AppSettings
  canAccess: (role: Role | undefined, page: PageKey) => boolean
  setPermission: (role: Role, page: PageKey, allowed: boolean) => void
  setDepots: (depots: string[]) => void
  setCurrency: (currency: CurrencyCode) => void
  setDistanceUnit: (unit: DistanceUnit) => void
  resetSettings: () => void
  formatMoney: (amount: number, opts?: { compact?: boolean }) => string
  formatDistance: (km: number, opts?: { decimals?: number }) => string
  distanceLabel: string
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  const persist = (next: AppSettings) => {
    setSettings(next)
    saveToStorage(SETTINGS_KEY, next)
  }

  function canAccess(role: Role | undefined, page: PageKey) {
    if (!role) return false
    if (role === 'Fleet Manager') return true // manager can never be locked out
    return (settings.permissions[role] ?? []).includes(page)
  }

  function setPermission(role: Role, page: PageKey, allowed: boolean) {
    if (role === 'Fleet Manager') return // locked
    const current = settings.permissions[role] ?? []
    const next = allowed ? [...new Set([...current, page])] : current.filter((p) => p !== page)
    persist({ ...settings, permissions: { ...settings.permissions, [role]: next } })
  }

  function setDepots(depots: string[]) {
    const cleaned = depots.map((d) => d.trim()).filter(Boolean)
    persist({ ...settings, depots: [...new Set(cleaned)] })
  }

  function setCurrency(currency: CurrencyCode) {
    persist({ ...settings, currency })
  }

  function setDistanceUnit(distanceUnit: DistanceUnit) {
    persist({ ...settings, distanceUnit })
  }

  function resetSettings() {
    persist(structuredClone(DEFAULT_SETTINGS))
  }

  function formatMoney(amount: number, opts?: { compact?: boolean }) {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: settings.currency,
      maximumFractionDigits: opts?.compact ? 0 : 2,
      notation: opts?.compact && Math.abs(amount) >= 100000 ? 'compact' : 'standard',
    }).format(amount)
  }

  function formatDistance(km: number, opts?: { decimals?: number }) {
    const value = settings.distanceUnit === 'mi' ? km / KM_PER_MILE : km
    const decimals = opts?.decimals ?? (Math.abs(value) >= 100 ? 0 : 1)
    return `${value.toLocaleString('en', { maximumFractionDigits: decimals })} ${settings.distanceUnit}`
  }

  const distanceLabel = settings.distanceUnit

  return (
    <SettingsContext.Provider
      value={{
        settings,
        canAccess,
        setPermission,
        setDepots,
        setCurrency,
        setDistanceUnit,
        resetSettings,
        formatMoney,
        formatDistance,
        distanceLabel,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
