import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Role, User } from '../types'
import { seedUsers } from '../data/seed'
import { loadFromStorage, saveToStorage } from '../lib/storage'

const SESSION_KEY = 'transitops.session'

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string }
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadFromStorage<User | null>(SESSION_KEY, null))

  useEffect(() => {
    saveToStorage(SESSION_KEY, user)
  }, [user])

  function login(email: string, password: string) {
    const match = seedUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    )
    if (!match) {
      return { ok: false as const, error: 'Invalid email or password.' }
    }
    setUser(match)
    return { ok: true as const }
  }

  function logout() {
    setUser(null)
  }

  function hasRole(...roles: Role[]) {
    return !!user && roles.includes(user.role)
  }

  return <AuthContext.Provider value={{ user, login, logout, hasRole }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
