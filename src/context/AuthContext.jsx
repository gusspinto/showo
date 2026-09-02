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
      supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan, phone, organization_id, account_type').eq('id', uid).single(),
      supabase.auth.getUser(),
    ])
    const meta = userRes.data?.user?.user_metadata ?? {}
    let data = profileRes.data

    if (!data && profileRes.error && profileRes.error.code !== 'PGRST116') {
      // Fallback sem organization_id — migration 056 pode ainda não estar aplicada
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan, phone')
        .eq('id', uid).single()
      if (fallbackErr && fallbackErr.code !== 'PGRST116') { setProfile(null); return }
      data = fallbackData ?? null
    }

    if (!data) {
      // A linha de perfil é criada no servidor por um trigger (migração 115).
      // Este INSERT é só uma rede de segurança para contas antigas anteriores
      // ao trigger. Tem de ser INSERT e não upsert: o upsert vira
      // INSERT ... ON CONFLICT DO UPDATE, e o Postgres exige UPDATE em `role`
      // e `id` — que `authenticated` não tem (migração 100) → 403.
      const PROFILE_COLS = 'id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan'
      const { data: created, error: createErr } = await supabase
        .from('profiles')
        .insert({ id: uid, full_name: meta.full_name ?? meta.name ?? null, role: 'aluno', company: meta.company ?? null, school: meta.school ?? null, avatar_url: (meta.avatar_url ?? meta.picture ?? '').replace(/=s\d+-c$/, '=s400-c') || null })
        .select(PROFILE_COLS)
        .single()
      if (createErr?.code === '23505') {
        // Corrida com o trigger (ou outra aba) — a linha já existe, relê.
        const { data: reread } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', uid).single()
        data = reread
      } else {
        data = created
        if (data) localStorage.setItem(`showo_needs_role_${uid}`, '1')
      }
    }

    // Process pending signup actions stored in user metadata
    if (data && meta) {
      if (meta.pending_class_code) {
        const { data: regResult } = await supabase.rpc('register_institutional_student', {
          p_class_code: meta.pending_class_code,
          p_email: userRes.data?.user?.email,
        })
        if (regResult?.ok) {
          const { data: refreshed } = await supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan, phone, account_type, organization_id').eq('id', uid).single()
          if (refreshed) data = refreshed
        }
        await supabase.auth.updateUser({ data: { pending_class_code: null } })
      }
      if (meta.pending_invite_code) {
        await supabase.rpc('redeem_professor_invite_code', {
          p_code: meta.pending_invite_code,
          p_full_name: meta.full_name ?? '',
          p_school: meta.pending_school ?? '',
        })
        const { data: refreshed } = await supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan, phone, account_type, organization_id').eq('id', uid).single()
        if (refreshed) data = refreshed
        await supabase.auth.updateUser({ data: { pending_invite_code: null, pending_school: null } })
      }
      if (meta.pending_partner_token) {
        await supabase.rpc('claim_partner_company_invite', { p_token: meta.pending_partner_token })
        const { data: refreshed } = await supabase.from('profiles').select('id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, plan, phone, account_type, organization_id').eq('id', uid).single()
        if (refreshed) data = refreshed
        await supabase.auth.updateUser({ data: { pending_partner_token: null } })
      }
      if (meta.pending_phone) {
        await supabase.from('profiles').update({ phone: meta.pending_phone }).eq('id', uid)
        await supabase.auth.updateUser({ data: { pending_phone: null } })
      }
    }

    setProfile(data ?? null)
    if (data) {
      identifyUser(userRes.data?.user, data)
      const storedRef = localStorage.getItem('showo_ref')
      if (storedRef && !data.referred_by) {
        supabase.rpc('claim_referral', { code: storedRef }).then(() => localStorage.removeItem('showo_ref'))
      }
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

  const isAdmin         = profile?.is_admin === true
  const isSchoolAccount = !!profile?.organization_id
  const planId          = profile?.role === 'professor' ? 'launch'
                        : isSchoolAccount ? 'school'
                        : (profile?.plan ?? 'free')
  const plan            = getPlan(planId)

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
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, isAdmin, plan, planId, isSchoolAccount, checkGate, consumeAI, aiUsage, refreshAiUsage: fetchAiUsage }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
