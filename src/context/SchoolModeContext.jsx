import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

/* ══════════════════════════════════════════════════════════════════════════
   MODO ESCOLA
   ──────────────────────────────────────────────────────────────────────────
   A Showo é duas coisas ao mesmo tempo: o portfólio pessoal do aluno e a sua
   vida escolar (turmas, tarefas, feedback do professor). Antes disto, a parte
   escolar aparecia só como um painel a mais na dashboard e — pior — estava
   presa a `isSchoolAccount` (organization_id). Um aluno que entrou numa turma
   com um código de professor nunca via as suas turmas, tarefas nem feedback:
   os dados eram carregados e depois escondidos por uma condição errada.

   Aqui a escola passa a ser um CONTEXTO explícito, não um painel:
     · hasSchool  — o utilizador tem alguma ligação escolar (turmas ou conta
                    de organização). Sem isto, nada de escola aparece na UI.
     · mode       — 'pessoal' | 'escola'. Persiste por utilizador, para o
                    aluno voltar sempre ao contexto onde estava.
   A navegação e a dashboard leem daqui, por isso o utilizador vê sempre um
   sítio só (o switcher) a dizer em que contexto está.
   ══════════════════════════════════════════════════════════════════════════ */

const SchoolModeContext = createContext({
  mode: 'pessoal', setMode: () => {}, toggleMode: () => {},
  hasSchool: false, isSchoolMode: false,
  classes: [], orgName: null, loading: true,
})

const MODES = ['pessoal', 'escola']
const key = uid => `showo_mode_${uid}`

export function SchoolModeProvider({ children }) {
  const { user, profile, isSchoolAccount } = useAuth()
  const [classes, setClasses] = useState([])
  const [orgName, setOrgName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modeRaw, setModeRaw] = useState('pessoal')

  // Restore the stored context as soon as we know who the user is.
  useEffect(() => {
    if (!user?.id) { setModeRaw('pessoal'); return }
    try {
      const stored = localStorage.getItem(key(user.id))
      if (MODES.includes(stored)) setModeRaw(stored)
    } catch { /* private mode / storage disabled */ }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) { setClasses([]); setOrgName(null); setLoading(false); return }
    let cancelled = false
    async function load() {
      const { data: memberships } = await supabase
        .from('class_members').select('class_id').eq('user_id', user.id)
      const classIds = [...new Set((memberships ?? []).map(m => m.class_id))]
      if (cancelled) return
      if (classIds.length) {
        const { data: rows } = await supabase
          .from('classes').select('id, name, subject, code, teacher_name').in('id', classIds)
        if (!cancelled) setClasses(rows ?? [])
      } else {
        setClasses([])
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!profile?.organization_id) { setOrgName(null); return }
    let cancelled = false
    supabase.from('organizations').select('name').eq('id', profile.organization_id).maybeSingle()
      .then(({ data }) => { if (!cancelled && data?.name) setOrgName(data.name) })
    return () => { cancelled = true }
  }, [profile?.organization_id])

  const hasSchool = isSchoolAccount || classes.length > 0

  const setMode = useCallback(next => {
    if (!MODES.includes(next)) return
    setModeRaw(next)
    if (user?.id) { try { localStorage.setItem(key(user.id), next) } catch {} }
  }, [user?.id])

  // A user who leaves every class must not stay stuck in an empty context.
  const mode = hasSchool ? modeRaw : 'pessoal'
  const toggleMode = useCallback(() => setMode(mode === 'escola' ? 'pessoal' : 'escola'), [mode, setMode])

  const value = useMemo(() => ({
    mode, setMode, toggleMode,
    hasSchool, isSchoolMode: mode === 'escola',
    classes, orgName, loading,
  }), [mode, setMode, toggleMode, hasSchool, classes, orgName, loading])

  return <SchoolModeContext.Provider value={value}>{children}</SchoolModeContext.Provider>
}

export function useSchoolMode() {
  return useContext(SchoolModeContext)
}
