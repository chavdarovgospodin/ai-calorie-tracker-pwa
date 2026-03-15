const KEY = 'calio_last_user'

export function saveLastUser(email: string, provider: 'google' | 'email') {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, provider }))
  } catch {}
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
