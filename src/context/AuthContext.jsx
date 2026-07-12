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
      supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work').eq('id', uid).single(),
      supabase.auth.getUser(),
    ])
    const meta = userRes.data?.user?.user_metadata ?? {}
    let data = profileRes.data

    // Profile doesn't exist yet — create it from user_metadata.
    // role is never trusted from client metadata here — it always starts as
    // 'aluno' (the DB's "Own profile insert" policy enforces this too).
    // Elevated roles (professor, ...) can only be set server-side, e.g. via
    // redeem_professor_invite_code.
    if (!data) {
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: uid, full_name: meta.full_name ?? null, role: 'aluno', company: meta.company ?? null, school: meta.school ?? null })
        .select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work')
        .single()
      data = created
    }

    setProfile(data ?? null)
    if (data) identifyUser(userRes.data?.user, data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u?.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u?.id)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // Call this after saving profile so Navbar/etc update immediately
  function refreshProfile() {
    if (user) fetchProfile(user.id)
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
