import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { finishGithubConnect } from '../lib/githubAuth'

/* Rota fixa: https://showo.pt/auth/github/callback — é o Authorization
   callback URL registado na OAuth App do GitHub, não pode mudar sem
   também mudar lá. */
export default function GithubCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('a-ligar') // a-ligar | erro
  const [error, setError] = useState(null)
  // Capturado logo no primeiro render, não num efeito — há um handler global
  // de erros de auth (App.jsx) que também observa "?error=" na URL e a limpa
  // com replaceState; correr depois dele perdia o parâmetro.
  const [params] = useState(() => new URLSearchParams(window.location.search))

  useEffect(() => {
    const code = params.get('code')
    const state = params.get('state')
    const ghError = params.get('error')

    if (ghError) {
      setStatus('erro')
      setError('Cancelaste a autorização no GitHub.')
      return
    }
    if (!code) {
      setStatus('erro')
      setError('Faltam dados do GitHub. Tenta ligar outra vez.')
      return
    }

    finishGithubConnect(code, state)
      .then(({ returnPath }) => navigate(returnPath, { replace: true }))
      .catch(err => {
        setStatus('erro')
        setError(err.message)
      })
  }, [navigate, params])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
        {status === 'a-ligar' ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>A ligar ao GitHub…</p>
        ) : (
          <>
            <p style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Não foi possível ligar</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13.5, margin: '0 0 20px' }}>{error}</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{ padding: '10px 20px', background: 'var(--color-primary)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Voltar à dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
