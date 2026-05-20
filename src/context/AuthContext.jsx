import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return }
    const [profileRes, userRes] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work').eq('id', uid).single(),
      supabase.auth.getUser(),
    ])
    const meta = userRes.data?.user?.user_metadata ?? {}
    const metaRole = meta.role
    let data = profileRes.data

    // Profile doesn't exist yet — create it from user_metadata
    if (!data) {
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: uid, full_name: meta.full_name ?? null, role: metaRole ?? 'aluno' })
        .select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work')
        .single()
      data = created
    } else if (metaRole && data.role !== metaRole) {
      // Sync role from user_metadata if it drifted
      await supabase.from('profiles').update({ role: metaRole }).eq('id', uid)
      data.role = metaRole
    }

    setProfile(data ?? null)
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
