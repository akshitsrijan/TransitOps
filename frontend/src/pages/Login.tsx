import { useState, type FormEvent, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Briefcase,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import type { Role } from '../types'

export default function Login() {
  const { 
    user, 
    login, 
    registerUser, 
    loginWithGoogle, 
    sendOTP, 
    simulatedEmail, 
    clearSimulatedEmail 
  } = useAuth()

  // Tab State: 'signin' | 'register'
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin')

  // Common Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Registration Fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<Role>('Fleet Manager')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [expectedCode, setExpectedCode] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)

  // Google Sign-In Simulation
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<{ name: string; email: string } | null>(null)
  const [googleSelectedRole, setGoogleSelectedRole] = useState<Role>('Fleet Manager')

  // Copy-to-clipboard feedback
  const [copiedOtp, setCopiedOtp] = useState(false)

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCountdown])

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  // Handle standard Login
  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setError('')
    setLoading(true)

    // Artificial tiny delay for premium feel
    setTimeout(() => {
      const result = login(email, password, rememberMe)
      setLoading(false)
      if (!result.ok) {
        setError(result.error)
      }
    }, 600)
  }

  // Request Registration OTP
  function handleRequestOTP() {
    if (!regName.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setError('')
    setLoading(true)

    setTimeout(() => {
      const otpRes = sendOTP(regEmail)
      setLoading(false)
      if (otpRes.ok) {
        setExpectedCode(otpRes.code)
        setOtpSent(true)
        setOtpCountdown(30)
      }
    }, 800)
  }

  // Complete Registration after OTP Verification
  function handleCompleteRegistration(e: FormEvent) {
    e.preventDefault()
    if (otpCode !== expectedCode) {
      setError('Invalid security verification code. Please check the simulated email.')
      return
    }

    setError('')
    setLoading(true)

    setTimeout(() => {
      const res = registerUser(regName, regEmail, regRole, regPassword, rememberMe)
      setLoading(false)
      if (res.ok) {
        // Success - AuthProvider automatically logs them in
        clearSimulatedEmail()
      } else {
        setError(res.error)
      }
    }, 700)
  }

  // Quick Account Login
  function quickLogin(quickEmail: string) {
    setError('')
    login(quickEmail, 'password123', true)
  }

  // Open Google Sign-In Simulation
  function handleGoogleButtonClick() {
    setError('')
    setShowGoogleModal(true)
  }

  // Select Google Account
  function handleSelectGoogleAccount(accountName: string, accountEmail: string) {
    setSelectedGoogleAccount({ name: accountName, email: accountEmail })
  }

  // Submit Google Sign-In
  function handleGoogleConfirm() {
    if (!selectedGoogleAccount) return
    loginWithGoogle(
      selectedGoogleAccount.name,
      selectedGoogleAccount.email,
      googleSelectedRole,
      rememberMe
    )
    setShowGoogleModal(false)
  }

  // Auto-fill OTP from simulator toast
  function autoFillOTP() {
    if (simulatedEmail) {
      setOtpCode(simulatedEmail.code)
      setCopiedOtp(true)
      setTimeout(() => setCopiedOtp(false), 2000)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center bg-slate-50 overflow-x-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100/30 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto space-y-8">
        {/* Company Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20 mb-4 border border-indigo-500/10">
            <Truck className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-display">
            Transit<span className="text-indigo-600">Ops</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Smart Fleet Management & Compliance Assurance
          </p>
        </div>

        {/* Auth Box Container */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8">
          {/* Custom Navigation Tabs */}
          <div className="flex border-b border-slate-100 pb-4 mb-6">
            <button
              onClick={() => {
                setActiveTab('signin')
                setError('')
              }}
              className={`flex-1 text-center pb-2 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'signin'
                  ? 'text-indigo-600 border-indigo-600 font-bold'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('register')
                setError('')
              }}
              className={`flex-1 text-center pb-2 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'register'
                  ? 'text-indigo-600 border-indigo-600 font-bold'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <span className="font-semibold uppercase bg-red-500 text-white rounded px-1.5 py-0.5 text-[9px]">Error</span>
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {activeTab === 'signin' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    placeholder="manager@transitops.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 bg-slate-50 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs text-slate-600 font-medium">Keep me signed in</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-3 px-4 rounded-lg shadow-lg shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Signing in securely...
                  </>
                ) : (
                  <>
                    Sign In
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <div className="space-y-5">
              {!otpSent ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                        placeholder="yourname@domain.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Operational Role
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Briefcase className="w-4 h-4" />
                      </span>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as Role)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                      >
                        <option value="Fleet Manager">Fleet Manager</option>
                        <option value="Driver">Driver</option>
                        <option value="Safety Officer">Safety Officer</option>
                        <option value="Financial Analyst">Financial Analyst</option>
                      </select>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {regRole === 'Fleet Manager' && 'Full system capabilities including dispatches and reports.'}
                      {regRole === 'Driver' && 'View vehicle details and log logs/mileage.'}
                      {regRole === 'Safety Officer' && 'View compliance, policy checks, safety ratings.'}
                      {regRole === 'Financial Analyst' && 'Review fuel costs, mileage efficiency metrics.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Create Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                        placeholder="Min. 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center space-x-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      id="rememberMeReg"
                      className="rounded border-slate-300 text-indigo-600 bg-slate-50 focus:ring-indigo-500 h-4 w-4"
                    />
                    <label htmlFor="rememberMeReg" className="text-xs text-slate-600 font-medium cursor-pointer">
                      Keep me signed in
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-3 px-4 rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating security token...
                      </>
                    ) : (
                      <>
                        Send Security OTP
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCompleteRegistration} className="space-y-5">
                  <div className="text-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-slate-900">Verify Your Identity</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      We have sent a 6-digit verification code to <span className="text-indigo-600 font-semibold">{regEmail}</span>. Please find this email in our sandbox at the bottom right.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      6-Digit OTP Code
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-400 text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false)
                        setOtpCode('')
                        setError('')
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline"
                    >
                      Change registration details
                    </button>

                    <button
                      type="button"
                      disabled={otpCountdown > 0 || loading}
                      onClick={() => {
                        sendOTP(regEmail)
                        setOtpCountdown(30)
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:no-underline font-medium"
                    >
                      {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : 'Resend Code'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm py-3 px-4 rounded-lg shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying credentials...
                      </>
                    ) : (
                      <>
                        Verify & Create Account
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Social Sign-In Splitter */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleButtonClick}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium text-sm py-2.5 px-4 rounded-lg active:scale-[0.99] transition-all shadow-sm"
          >
            {/* Google Vector Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.97 1 12 1 7.24 1 3.2 3.69 1.15 7.65l3.87 3C5.97 7.37 8.76 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.71-4.94 3.71-8.6z"
              />
              <path
                fill="#FBBC05"
                d="M5.02 10.65c-.24-.72-.38-1.49-.38-2.3c0-.81.14-1.58.38-2.3L1.15 3.05C.42 4.49 0 6.13 0 7.85s.42 3.36 1.15 4.8l3.87-3z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.24 0-6.03-2.33-7.01-5.61l-3.87 3C3.2 19.31 7.24 23 12 23z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        {/* Demo Fast Track Login (Bento-styled grid) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              Demo Sandbox Fast-Track
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => quickLogin('manager@transitops.com')}
              className="flex flex-col items-start p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all shadow-sm"
            >
              <span className="text-xs font-bold text-slate-800">Fleet Manager</span>
              <span className="text-[10px] text-slate-500 mt-0.5">manager@transitops.com</span>
            </button>
            <button
              onClick={() => quickLogin('driver@transitops.com')}
              className="flex flex-col items-start p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all shadow-sm"
            >
              <span className="text-xs font-bold text-slate-800">Driver</span>
              <span className="text-[10px] text-slate-500 mt-0.5">driver@transitops.com</span>
            </button>
            <button
              onClick={() => quickLogin('safety@transitops.com')}
              className="flex flex-col items-start p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all shadow-sm"
            >
              <span className="text-xs font-bold text-slate-800">Safety Officer</span>
              <span className="text-[10px] text-slate-500 mt-0.5">safety@transitops.com</span>
            </button>
            <button
              onClick={() => quickLogin('finance@transitops.com')}
              className="flex flex-col items-start p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-left transition-all shadow-sm"
            >
              <span className="text-xs font-bold text-slate-800">Financial Analyst</span>
              <span className="text-[10px] text-slate-500 mt-0.5">finance@transitops.com</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Sign-In Simulation Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-semibold text-slate-800 text-sm">Sign in with Google</span>
              </div>
              <button
                onClick={() => {
                  setShowGoogleModal(false)
                  setSelectedGoogleAccount(null)
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {!selectedGoogleAccount ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                    Choose one of your connected Google Accounts or create a custom simulation.
                  </p>

                  <div className="space-y-2">
                    {/* Primary user email from metadata */}
                    <button
                      onClick={() => handleSelectGoogleAccount('Mithil Kokane', 'mithilrkokane@gmail.com')}
                      className="flex items-center gap-3 w-full p-3 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        MK
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Mithil Kokane</p>
                        <p className="text-xs text-slate-500">mithilrkokane@gmail.com</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSelectGoogleAccount('Alex Rivera', 'alex.rivera@gmail.com')}
                      className="flex items-center gap-3 w-full p-3 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                        AR
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Alex Rivera</p>
                        <p className="text-xs text-slate-500">alex.rivera@gmail.com</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSelectGoogleAccount('Guest Operator', 'guest.ops@gmail.com')}
                      className="flex items-center gap-3 w-full p-3 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                        GO
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Guest Operator</p>
                        <p className="text-xs text-slate-500">guest.ops@gmail.com</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-700">
                      {selectedGoogleAccount.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{selectedGoogleAccount.name}</p>
                      <p className="text-xs text-slate-500">{selectedGoogleAccount.email}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Select Your Operational Access Role
                    </label>
                    <select
                      value={googleSelectedRole}
                      onChange={(e) => setGoogleSelectedRole(e.target.value as Role)}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Fleet Manager">Fleet Manager (Full Admin)</option>
                      <option value="Driver">Driver (Log Mileage & Deliveries)</option>
                      <option value="Safety Officer">Safety Officer (Audit & Compliance)</option>
                      <option value="Financial Analyst">Financial Analyst (Analyze Expenses)</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedGoogleAccount(null)}
                      className="flex-1 py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleGoogleConfirm}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Confirm & Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SIMULATED EMAIL NOTIFIER */}
      {simulatedEmail && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white rounded-xl shadow-2xl border-l-4 border-indigo-600 border border-slate-200 overflow-hidden animate-slide-up font-sans text-slate-800">
          {/* Email Header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
              <span className="text-xs font-bold text-indigo-700 tracking-wider uppercase">Sandbox Email Client</span>
            </div>
            <button
              onClick={clearSimulatedEmail}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>

          {/* Email Body */}
          <div className="p-4">
            <div className="text-[11px] text-slate-500 space-y-0.5">
              <p><strong>To:</strong> {simulatedEmail.to}</p>
              <p><strong>Subject:</strong> {simulatedEmail.subject}</p>
              <p><strong>Sent:</strong> {simulatedEmail.sentAt}</p>
            </div>
            
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/60 font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {simulatedEmail.body}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={autoFillOTP}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
              >
                {copiedOtp ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Applied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Auto-Fill Code ({simulatedEmail.code})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
