import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { identifyUser, resetAnalytics } from '../lib/analytics'
import { getPlan, remainingUses, PLAN_GATE_MESSAGES } from '../lib/plans'

const AuthContext = createContext({})

async function persistGoogleAvatar(uid, googleUrl) {
  try {
    const res = await fetch(googleUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    const path = `${uid}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: blob.type })
    if (error) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiUsage, setAiUsage] = useState({})

  const fetchAiUsage = useCallback(async () => {
    const { data } = await supabase.rpc('get_ai_usage')
    if (data) setAiUsage(data)
  }, [])

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); setAiUsage({}); resetAnalytics(); return }
    const [profileRes, userRes] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan').eq('id', uid).single(),
      supabase.auth.getUser(),
    ])
    const meta = userRes.data?.user?.user_metadata ?? {}
    let data = profileRes.data

    if (!data && profileRes.error && profileRes.error.code !== 'PGRST116') {
      setProfile(null)
      return
    }

    if (!data) {
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: uid, full_name: meta.full_name ?? meta.name ?? null, role: 'aluno', company: meta.company ?? null, school: meta.school ?? null, avatar_url: (meta.avatar_url ?? meta.picture ?? '').replace(/=s\d+-c$/, '=s400-c') || null })
        .select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan')
        .single()
      data = created
      if (data) localStorage.setItem(`showo_needs_role_${uid}`, '1')
    }

    setProfile(data ?? null)
    if (data) {
      identifyUser(userRes.data?.user, data)
      const ts = new Date().toISOString()
      supabase.from('profiles').update({ last_active_at: ts, last_action: 'login' }).eq('id', uid).then(() => {})
      supabase.from('activity_log').insert({ user_id: uid, action: 'login' }).then(() => {})
      const freshGoogleAvatar = (meta.avatar_url ?? meta.picture ?? '').replace(/=s\d+-c$/, '=s400-c')
      if (freshGoogleAvatar && (data.avatar_url?.includes('googleusercontent.com') || !data.avatar_url)) {
        persistGoogleAvatar(uid, freshGoogleAvatar).then(permanent => {
          if (permanent) {
            supabase.from('profiles').update({ avatar_url: permanent }).eq('id', uid).then(() => {})
            setProfile(prev => prev ? { ...prev, avatar_url: permanent } : prev)
          }
        })
      }
      fetchAiUsage()
    }
  }, [fetchAiUsage])

  useEffect(() => {
    let sawInitial = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'TOKEN_REFRESHED') return
      const u = session?.user ?? null
      setUser(u)
      fetchProfile(u?.id).then(() => {
        if (!sawInitial) { sawInitial = true; setLoading(false) }
      })
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setAiUsage({})
  }

  async function refreshProfile() {
    const { data: { user: current } } = await supabase.auth.getUser()
    if (current) return fetchProfile(current.id)
  }

  const isAdmin = profile?.is_admin === true
  const planId  = profile?.plan ?? 'free'
  const plan    = getPlan(planId)

  function checkGate(feature, projectCount) {
    if (feature === 'maxProjects') {
      const allowed = projectCount < plan.maxProjects
      return { allowed, message: allowed ? null : PLAN_GATE_MESSAGES.maxProjects(planId) }
    }
    if (feature === 'internshipPage' || feature === 'weeklyRecap') {
      const allowed = plan.career[feature] === true
      return { allowed, message: allowed ? null : PLAN_GATE_MESSAGES[feature]?.() }
    }
    const limit = plan.ai[feature] ?? 0
    const remaining = remainingUses(planId, feature, aiUsage)
    const allowed = remaining > 0
    return { allowed, remaining, limit, message: allowed ? null : PLAN_GATE_MESSAGES[feature]?.(planId) }
  }

  // After a successful AI call, refresh usage from server
  async function consumeAI(_feature) {
    await fetchAiUsage()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, isAdmin, plan, planId, checkGate, consumeAI, aiUsage, refreshAiUsage: fetchAiUsage }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
