// Base URL of the FastAPI backend. The frontend is otherwise fully client-side;
// the backend is only used for optional services like real OTP email delivery.
export const API_BASE = 'http://localhost:8000'

export interface SendOtpResult {
  sent: boolean
  via: 'smtp' | 'disabled' | 'error' | 'unreachable'
  detail?: string
}

/**
 * Ask the backend to deliver the OTP to the user's real inbox.
 * Never throws — returns { sent: false, via: 'unreachable' } when the backend
 * is down so callers can fall back to the sandbox email simulation.
 */
export async function requestOtpEmail(email: string, code: string, name = ''): Promise<SendOtpResult> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, name }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { sent: false, via: 'error', detail: `HTTP ${res.status}` }
    return (await res.json()) as SendOtpResult
  } catch (err) {
    return { sent: false, via: 'unreachable', detail: err instanceof Error ? err.message : String(err) }
  }
}
