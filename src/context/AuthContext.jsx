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
      supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role').eq('id', uid).single(),
      supabase.auth.getUser(),
    ])
    const data = profileRes.data
    const metaRole = userRes.data?.user?.user_metadata?.role
    // Sync role from user_metadata to profile if profile has default/missing role
    if (data && metaRole && data.role !== metaRole) {
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
