import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LinkedInPostModal from '../components/LinkedInPostModal'
import { weekStartISO } from '../lib/journal'

/* Página para onde o email de segunda aponta — mas também onde alguém pode
   cair a meio da semana (a testar, ou a voltar depois de gerar). Por isso
   olha primeiro para a semana ATUAL (segunda até agora): é o caso de quem
   acabou de registar e quer ver o post já. Só cai para a semana passada
   (segunda a domingo anteriores) quando a atual está vazia — que é
   exatamente a situação de segunda de manhã, quando o email chega e a
   semana atual ainda não teve tempo de ter nada. */

const SUBSTANTIVE_MIN = 3

function weekRanges() {
  const thisMonday = new Date(weekStartISO() + 'T00:00:00')
  const lastMonday = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate() - 7)
  return {
    current: { start: thisMonday, end: new Date() },
    last: { start: lastMonday, end: thisMonday },
  }
}

export default function PostSemana() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState('loading') // loading | ready | thin | error
  const [payload, setPayload] = useState(null)
  const [debug, setDebug] = useState(null)

  useEffect(() => { if (!authLoading && !user) navigate('/login') }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    // Agrupa por projeto e devolve as entradas do projeto com mais registos
    // na janela — só entre os projetos passados em `entries` (o chamador já
    // filtrou por partilhável ou não, conforme o que precisa de saber).
    function topProjectEntries(entries, start, end) {
      const inRange = entries.filter(e => {
        const t = new Date(e.created_at)
        return t >= start && t < end
      })
      const byProject = {}
      for (const e of inRange) {
        (byProject[e.project_id] ||= []).push(e)
      }
      const topId = Object.keys(byProject).sort((a, b) => byProject[b].length - byProject[a].length)[0]
      return topId ? byProject[topId] : []
    }

    async function load() {
      const { current, last } = weekRanges()
      const { data: entries, error } = await supabase
        .from('project_journal_entries')
        .select('project_id, kind, content, created_at, projects(name, slug, visibility)')
        .eq('user_id', user.id)
        .gte('created_at', last.start.toISOString())
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (error) { setDebug({ error: error.message }); setState('error'); return }

      // "Privado" bloqueia — ninguém que clique no link vê nada. "Não
      // listado" ainda serve, é só invisível na Explorar. O projeto que
      // ganha por volume de registos tem de ser um destes dois, senão o
      // dono de um projeto privado com muitos commits automáticos "roubava"
      // o lugar ao projeto que a pessoa quer mesmo partilhar.
      const shareable = (entries || []).filter(e => e.projects && e.projects.visibility !== 'private')

      // A semana atual ganha se já tiver substância partilhável — é o caso
      // de quem acabou de registar. Só olha para a passada quando a atual
      // ainda não tem nada (segunda de manhã, quando o email chega).
      const currentShareable = topProjectEntries(shareable, current.start, current.end)
      const weekEntries = currentShareable.length >= SUBSTANTIVE_MIN
        ? currentShareable
        : topProjectEntries(shareable, last.start, last.end)

      if (weekEntries.length >= SUBSTANTIVE_MIN) {
        const project = weekEntries[0].projects
        const activeDays = new Set(weekEntries.map(e => e.created_at.slice(0, 10))).size
        setPayload({
          projectName: project.name,
          projectUrl: `${window.location.origin}/projeto/${project.slug}`,
          entryCount: weekEntries.length,
          activeDays,
          streak: 0,
          entries: weekEntries.map(e => ({ kind: e.kind, text: e.content || '' })).filter(e => e.text),
        })
        setState('ready')
        return
      }

      // Nada partilhável chegou ao limiar — mas se houver substância só em
      // projetos privados, a mensagem certa é "torna público", não "regista
      // mais", que seria enganador.
      const anyCurrent = topProjectEntries(entries || [], current.start, current.end)
      const anyLast = topProjectEntries(entries || [], last.start, last.end)
      const hadSubstanceButPrivate = anyCurrent.length >= SUBSTANTIVE_MIN || anyLast.length >= SUBSTANTIVE_MIN
      setDebug({
        totalEntries: (entries || []).length,
        withProjectJoin: (entries || []).filter(e => e.projects).length,
        sample: (entries || []).slice(0, 3).map(e => ({
          created_at: e.created_at, project_id: e.project_id,
          projects: e.projects,
        })),
        currentShareableCount: currentShareable.length,
        anyCurrentCount: anyCurrent.length,
        anyLastCount: anyLast.length,
      })
      setState(hadSubstanceButPrivate ? 'private' : 'thin')
    }

    load()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div className="min-h-screen bg-page font-body">
      <Navbar />
      <div style={{
        maxWidth: 560, margin: '0 auto', padding: '48px 24px', textAlign: 'center',
        minHeight: 'calc(100dvh - 56px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {state === 'loading' && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>A preparar o teu post…</p>
        )}

        {state === 'thin' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 8px' }}>
              A semana passada teve poucos registos
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Um post de progresso fica melhor quando há algo concreto para contar. Regista o que fizeres esta semana e o próximo email já traz o rascunho.
            </p>
            <button onClick={() => navigate('/dashboard')} style={btnStyle}>Ir para a dashboard</button>
          </>
        )}

        {state === 'private' && (
          <>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--color-text)', margin: '0 0 8px' }}>
              Torna o projeto público primeiro
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: '0 0 20px' }}>
              O post leva o link do projeto no fim. Se o projeto estiver privado, quem clicar não vê nada.
            </p>
            <button onClick={() => navigate('/dashboard')} style={btnStyle}>Ir para a dashboard</button>
          </>
        )}

        {state === 'error' && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Não foi possível carregar. <button onClick={() => window.location.reload()} style={{ ...btnStyle, padding: '4px 10px', marginLeft: 6 }}>Tentar outra vez</button>
          </p>
        )}

        {/* Diagnóstico temporário — só com ?debug=1 no URL. */}
        {debug && new URLSearchParams(window.location.search).get('debug') === '1' && (
          <pre style={{
            marginTop: 24, padding: 14, textAlign: 'left', maxWidth: '100%', overflow: 'auto',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--color-text-secondary)',
          }}>{JSON.stringify(debug, null, 2)}</pre>
        )}
      </div>

      {state === 'ready' && payload && (
        <LinkedInPostModal mode="weekly" payload={payload} onClose={() => navigate('/dashboard')} />
      )}
    </div>
  )
}

const btnStyle = {
  background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none',
  borderRadius: 'var(--radius-md)', padding: '9px 18px',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
}
