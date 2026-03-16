'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { saveLastUser, getLastUser } from '@/lib/lastUser'
import { toast } from 'sonner'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      toast.error('Authentication failed. Please try again.')
    }
  }, [searchParams])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUser, setLastUser] = useState<{ email: string; provider: 'google' | 'email' } | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setLastUser(getLastUser())
  }, [])

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      saveLastUser(email, 'email')
      toast.success('Welcome back!')
      router.push('/')
      router.refresh()
    }
  }

  async function handleContinueAsLastUser() {
    if (!lastUser) return
    if (lastUser.provider === 'google') {
      setGoogleLoading(true)
      setError('')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { login_hint: lastUser.email },
        },
      })
      if (error) {
        setError(error.message)
        setGoogleLoading(false)
      }
    } else {
      setEmail(lastUser.email)
      setTimeout(() => {
        document.getElementById('password-input')?.focus()
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            CALIO
          </h1>
          <p className="text-[#64748B] mt-2 text-sm">Track smarter. Eat better.</p>
        </div>

        <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6">
          {/* Continue as last user */}
          {lastUser && (
            <div className="mb-5">
              <p className="text-xs text-[#64748B] text-center mb-3">
                Welcome back
              </p>
              <button
                onClick={handleContinueAsLastUser}
                className="w-full flex items-center gap-3 bg-[#1A1A24] hover:bg-[#2A2A3E] border border-indigo-500/30 rounded-xl px-4 py-3 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {lastUser.email[0].toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC] truncate">
                    {lastUser.email}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {lastUser.provider === 'google' ? 'Continue with Google' : 'Continue with password'}
                  </p>
                </div>
                <div className="text-indigo-400 text-xs font-medium">
                  Tap to sign in →
                </div>
              </button>
              <button
                onClick={() => setLastUser(null)}
                className="w-full text-center text-xs text-[#64748B] hover:text-[#F8FAFC] mt-2 py-1 transition-colors"
              >
                Use a different account
              </button>
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] rounded-xl px-5 py-3 font-semibold text-[#F8FAFC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-[#64748B] border-t-indigo-500 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#1E1E2E]" />
            <span className="text-xs text-[#64748B]">or continue with email</span>
            <div className="flex-1 h-px bg-[#1E1E2E]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Password</label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-[#64748B] mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
