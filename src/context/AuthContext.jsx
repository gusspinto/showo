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

    const PROFILE_SELECT = 'id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, occupation, plan, phone, organization_id, account_type'
    const PROFILE_SELECT_LEGACY = 'id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, linkedin_url, skills, monthly_report_opt_in, area, occupation, plan, phone'

    const [profileRes, userRes] = await Promise.all([
      supabase.from('profiles').select(PROFILE_SELECT).eq('id', uid).single(),
      supabase.auth.getUser(),
    ])
    const meta = userRes.data?.user?.user_metadata ?? {}
    let data = profileRes.data

    if (!data && profileRes.error && profileRes.error.code !== 'PGRST116') {
      // Fallback sem organization_id — migration 056 pode ainda não estar aplicada
      const { data: fallbackData, error: fallbackErr } = await supabase
        .from('profiles').select(PROFILE_SELECT_LEGACY).eq('id', uid).single()
      if (fallbackErr && fallbackErr.code !== 'PGRST116') {
        // Erro real (400/rede/sessão a estabilizar logo após login). NÃO
        // definir profile como null — isso deixava as páginas a fazer
        // profile.role a rebentar ("algo correu mal"). Propaga para quem
        // chama voltar a tentar.
        throw fallbackErr
      }
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

    // Ações pendentes do registo, guardadas nos metadados. Uma falha aqui
    // (RPC/rede) não pode impedir o perfil de ser aplicado — senão as
    // páginas ficam com profile=null e rebentam. Correm noutra tentativa.
    try {
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
        // `data` foi lido antes desta escrita — reflete-a já em memória, senão
        // o perfil no estado fica com o valor antigo até um refresh futuro.
        if (data) data = { ...data, phone: meta.pending_phone }
      }
      if (meta.pending_occupation) {
        await supabase.from('profiles').update({ occupation: meta.pending_occupation }).eq('id', uid)
        await supabase.auth.updateUser({ data: { pending_occupation: null } })
        // Sem isto o OccupationGate volta a pedir a ocupação que o registo já
        // gravou — o `data` local ainda a tinha a null.
        if (data) data = { ...data, occupation: meta.pending_occupation }
      }
    }
    } catch (e) {
      console.warn('[auth] ação pendente falhou, tenta na próxima:', e?.message)
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
    let cancelled = false
    let sawInitial = false
    let lastUid = undefined

    // Lê o perfil com re-tentativas. Logo após o login a sessão ainda está
    // a assentar e uma query pode falhar (400/rede) — em vez de rebentar,
    // tenta de novo com backoff curto.
    async function loadProfile(u, attempt = 0) {
      if (cancelled) return
      try {
        await fetchProfile(u?.id)
        if (!sawInitial && !cancelled) { sawInitial = true; setLoading(false) }
      } catch {
        if (u?.id && attempt < 5 && !cancelled) {
          setTimeout(() => loadProfile(u, attempt + 1), 500 + attempt * 500)
        } else if (!sawInitial && !cancelled) {
          // Desistimos — pelo menos não deixa o loader eterno.
          sawInitial = true; setLoading(false)
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)

      // Só um refresh de token / update de metadados — a sessão não mudou
      // de dono. Não relê o perfil (evita loops).
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return

      // Mesmo utilizador (ex: INITIAL_SESSION seguido de SIGNED_IN no
      // arranque) — não relê outra vez.
      if (u?.id && u.id === lastUid) return
      lastUid = u?.id ?? null

      // NUNCA chamar métodos do supabase-js de forma síncrona dentro deste
      // callback — ele segura um lock interno e chamadas aqui entram em
      // deadlock (refresh de token falha → logout sozinho; queries penduram
      // → "algo correu mal"). Adiar para fora do callback.
      setTimeout(() => loadProfile(u), 0)
    })

    return () => { cancelled = true; subscription.unsubscribe() }
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
  const planId          = profile?.role === 'professor' ? 'pro'
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
