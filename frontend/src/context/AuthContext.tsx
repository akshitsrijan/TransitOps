import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Role, User } from '../types'
import { seedUsers } from '../data/seed'
import { loadFromStorage, saveToStorage } from '../lib/storage'

const SESSION_KEY = 'transitops.session'
const REGISTERED_USERS_KEY = 'transitops.registered_users'

interface SimulatedEmail {
  to: string
  subject: string
  body: string
  code: string
  sentAt: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string, rememberMe?: boolean) => { ok: true } | { ok: false; error: string }
  registerUser: (name: string, email: string, role: Role, password: string, rememberMe?: boolean) => { ok: true; user: User } | { ok: false; error: string }
  loginWithGoogle: (name: string, email: string, role: Role, rememberMe?: boolean) => { ok: true }
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
  getUsers: () => User[]
  sendOTP: (email: string) => { ok: true; code: string }
  activeOTP: { email: string; code: string; expiresAt: number } | null
  simulatedEmail: SimulatedEmail | null
  clearSimulatedEmail: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Load initial user session checking both localStorage (Remember Me) and sessionStorage (session-only)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const local = localStorage.getItem(SESSION_KEY)
      if (local) return JSON.parse(local) as User
      const session = sessionStorage.getItem(SESSION_KEY)
      if (session) return JSON.parse(session) as User
    } catch {
      // Ignore parsing errors
    }
    return null
  })

  // Load custom registered users
  const [customUsers, setCustomUsers] = useState<User[]>(() => 
    loadFromStorage<User[]>(REGISTERED_USERS_KEY, [])
  )

  // Interactive OTP state
  const [activeOTP, setActiveOTP] = useState<{ email: string; code: string; expiresAt: number } | null>(null)
  const [simulatedEmail, setSimulatedEmail] = useState<SimulatedEmail | null>(null)

  // Sync user session state to the appropriate storage based on "Remember Me"
  const persistSession = (currentUser: User | null, remember: boolean) => {
    if (currentUser === null) {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
    } else if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser))
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser))
      localStorage.removeItem(SESSION_KEY)
    }
  }

  // Combine seed users and custom users
  function getUsers(): User[] {
    return [...seedUsers, ...customUsers]
  }

  function login(email: string, password: string, rememberMe = true) {
    const allUsers = getUsers()
    const match = allUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    )
    if (!match) {
      return { ok: false as const, error: 'Invalid email or password.' }
    }
    setUser(match)
    persistSession(match, rememberMe)
    return { ok: true as const }
  }

  function registerUser(name: string, email: string, role: Role, password: string, rememberMe = true) {
    const allUsers = getUsers()
    if (allUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return { ok: false as const, error: 'An account with this email already exists.' }
    }

    const newUser: User = {
      id: `u-reg-${Date.now()}`,
      name,
      email: email.trim().toLowerCase(),
      role,
      password
    }

    const updatedCustom = [...customUsers, newUser]
    setCustomUsers(updatedCustom)
    saveToStorage(REGISTERED_USERS_KEY, updatedCustom)

    setUser(newUser)
    persistSession(newUser, rememberMe)
    return { ok: true as const, user: newUser }
  }

  function loginWithGoogle(name: string, email: string, role: Role, rememberMe = true) {
    const allUsers = getUsers()
    let match = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase())

    if (!match) {
      // Automatically register them
      match = {
        id: `u-g-${Date.now()}`,
        name,
        email: email.trim().toLowerCase(),
        role,
        password: 'google-oauth-managed-account'
      }
      const updatedCustom = [...customUsers, match]
      setCustomUsers(updatedCustom)
      saveToStorage(REGISTERED_USERS_KEY, updatedCustom)
    }

    setUser(match)
    persistSession(match, rememberMe)
    return { ok: true as const }
  }

  function logout() {
    setUser(null)
    persistSession(null, true)
  }

  function hasRole(...roles: Role[]) {
    return !!user && roles.includes(user.role)
  }

  function sendOTP(email: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

    setActiveOTP({ email, code, expiresAt })

    const newEmail: SimulatedEmail = {
      to: email,
      subject: 'TransitOps Security Code - Action Required',
      body: `Hello! You have requested a verification code to register on the TransitOps Smart Transport Operations Platform.\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 5 minutes. If you did not request this code, please ignore this email.`,
      code,
      sentAt: new Date().toLocaleTimeString()
    }

    setSimulatedEmail(newEmail)
    return { ok: true as const, code }
  }

  function clearSimulatedEmail() {
    setSimulatedEmail(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        registerUser,
        loginWithGoogle,
        logout,
        hasRole,
        getUsers,
        sendOTP,
        activeOTP,
        simulatedEmail,
        clearSimulatedEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
