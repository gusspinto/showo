import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { identifyUser, resetAnalytics } from '../lib/analytics'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); resetAnalytics(); return }
    const [profileRes, userRes] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area').eq('id', uid).single(),
      supabase.auth.getUser(),
    ])
    const meta = userRes.data?.user?.user_metadata ?? {}
    let data = profileRes.data

    if (!data && profileRes.error) {
      setProfile(null)
      return
    }

    // Profile doesn't exist yet — create it from user_metadata.
    // role is never trusted from client metadata here — it always starts as
    // 'aluno' (the DB's "Own profile insert" policy enforces this too).
    // Elevated roles (professor, ...) can only be set server-side, e.g. via
    // redeem_professor_invite_code.
    if (!data) {
      const { data: created } = await supabase
        .from('profiles')
        // avatar_url/full_name come from Google's user_metadata on OAuth sign-ups
        // (email/password users simply have these undefined → null).
        .upsert({ id: uid, full_name: meta.full_name ?? meta.name ?? null, role: 'aluno', company: meta.company ?? null, school: meta.school ?? null, avatar_url: meta.avatar_url ?? meta.picture ?? null })
        .select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area')
        .single()
      data = created
    }

    setProfile(data ?? null)
    if (data) identifyUser(userRes.data?.user, data)
  }, [])

  useEffect(() => {
    // onAuthStateChange alone covers the initial load too — it fires an
    // INITIAL_SESSION event (with the current session, or null) as soon as
    // the listener is registered, so a separate getSession() call here would
    // just duplicate that first fetchProfile() call on every app boot.
    let sawInitial = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // TOKEN_REFRESHED fires periodically (~hourly) on long-lived sessions
      // without the user's identity or profile actually changing — skip the
      // needless re-fetch.
      if (_event === 'TOKEN_REFRESHED') return
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u?.id)
      if (!sawInitial) { sawInitial = true; setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // Call this after saving profile so Navbar/etc update immediately. Asks
  // Supabase for the current user directly instead of trusting the `user`
  // state closure — a caller right after signUp/signIn can run before this
  // provider's own onAuthStateChange listener has caught up. Returns the
  // fetch promise so callers can await it before navigating.
  async function refreshProfile() {
    const { data: { user: current } } = await supabase.auth.getUser()
    if (current) return fetchProfile(current.id)
  }

  const isAdmin = profile?.is_admin === true

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
