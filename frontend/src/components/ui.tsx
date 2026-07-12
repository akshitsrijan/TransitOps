import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles: Record<string, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10 active:scale-[0.98]',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-500 shadow-md shadow-red-600/10 active:scale-[0.98]',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  Available: { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200/50' },
  'On Trip': { bg: 'bg-blue-50/80', text: 'text-blue-700', border: 'border-blue-200/50' },
  'In Shop': { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200/50' },
  Retired: { bg: 'bg-slate-100/80', text: 'text-slate-600', border: 'border-slate-200/50' },
  'Off Duty': { bg: 'bg-slate-50/80', text: 'text-slate-500', border: 'border-slate-200/50' },
  Suspended: { bg: 'bg-red-50/80', text: 'text-red-700', border: 'border-red-200/50' },
  Draft: { bg: 'bg-slate-100/80', text: 'text-slate-700', border: 'border-slate-200/50' },
  Dispatched: { bg: 'bg-indigo-50/80', text: 'text-indigo-700', border: 'border-indigo-200/50' },
  Completed: { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200/50' },
  Cancelled: { bg: 'bg-red-50/80', text: 'text-red-700', border: 'border-red-200/50' },
  Active: { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200/50' },
  Closed: { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200/50' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusColors[status] ?? { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${config.bg} ${config.text} ${config.border}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100/40 hover:shadow-md transition-shadow duration-300 ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm transition-all animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 border border-slate-100 shadow-2xl relative">
        <div className="mb-5 flex items-center justify-between border-b border-slate-50 pb-3">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50/50'

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="mt-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-medium text-red-700">{children}</p>
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/30">
      {children}
    </div>
  )
}
