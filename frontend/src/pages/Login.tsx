import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { seedUsers } from '../data/seed'
import { Button, ErrorText, Field, inputClass } from '../components/ui'

export default function Login() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  function quickLogin(quickEmail: string) {
    setEmail(quickEmail)
    setPassword('password123')
    login(quickEmail, 'password123')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">TransitOps</h1>
          <p className="mt-1 text-sm text-slate-500">Smart Transport Operations Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@transitops.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="mt-4 w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Demo accounts</p>
          <div className="space-y-1.5">
            {seedUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => quickLogin(u.email)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="text-slate-700">{u.role}</span>
                <span className="text-xs text-slate-400">{u.email}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Password for all demo accounts: password123</p>
        </div>
      </div>
    </div>
  )
}
