export type Result = { ok: true } | { ok: false; error: string }

export const ok: Result = { ok: true }

export function fail(error: string): Result {
  return { ok: false, error }
}
