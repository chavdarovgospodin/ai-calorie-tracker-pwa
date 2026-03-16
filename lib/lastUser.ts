const KEY = 'calio_last_user'
const HAS_LOGGED_IN_KEY = 'calio_has_logged_in'

export function saveLastUser(email: string, provider: 'google' | 'email') {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, provider }))
    localStorage.setItem(HAS_LOGGED_IN_KEY, 'true')
  } catch {}
}

export function hasLoggedInBefore(): boolean {
  try {
    return localStorage.getItem(HAS_LOGGED_IN_KEY) === 'true'
  } catch { return false }
}

export function getLastUser(): { email: string; provider: 'google' | 'email' } | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearLastUser() {
  try { localStorage.removeItem(KEY) } catch {}
}
