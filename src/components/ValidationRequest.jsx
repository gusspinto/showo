// PROTÓTIPO — pedido de validação do aluno ao professor.
// Só UI e estado local: não envia email nem grava nada. O envio é simulado.
// O lado do professor (como valida sem turma) ainda não está decidido.
import { useState } from 'react'
import { LetterIcon as Mail } from '@solar-icons/react/linear/letter'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/linear/square-academic-cap'
import { CheckCircleIcon as CheckCircle } from '@solar-icons/react/linear/check-circle'
import { ClockCircleIcon as Clock } from '@solar-icons/react/linear/clock-circle'
import { VerifiedCheckIcon as Verified } from '@solar-icons/react/linear/verified-check'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/linear/arrow-right'
import { Modal, Button, Input } from './ui'

const S = {
  card: {
    display: 'flex', flexDirection: 'column', gap: 12,
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', padding: 18,
  },
  cardHead: { display: 'flex', alignItems: 'center', gap: 10 },
  iconWrap: (tone = 'var(--color-primary)', bg = 'var(--color-primary-subtle)') => ({
    width: 34, height: 34, borderRadius: 'var(--radius-md)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: tone, background: bg,
  }),
  eyebrow: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' },
  cardTitle: { margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.35 },
  cardBody: { margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.55 },
  muted: { margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 },
  preview: {
    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
  },
  previewLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' },
  previewSubject: { fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' },
  previewProject: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', padding: 10,
  },
  thumb: {
    width: 40, height: 40, borderRadius: 'var(--radius-sm)', flexShrink: 0,
    background: 'var(--brand-gradient)', opacity: 0.85,
  },
  fakeBtn: {
    alignSelf: 'flex-start', fontSize: 'var(--text-xs)', fontWeight: 700,
    color: '#fff', background: 'var(--color-primary)', borderRadius: 'var(--radius-full)', padding: '7px 14px',
  },
  row: { display: 'flex', gap: 10 },
  steps: { display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none' },
  step: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 },
  stepNum: {
    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-primary)', background: 'var(--color-primary-subtle)',
  },
}

function teacherLabel(name) {
  const n = name.trim()
  return n ? `Prof. ${n}` : 'o teu professor'
}

// Cartão na página do projeto (só o dono vê). Três estados: pedir, à espera, validado.
export function ValidationRequestCard({ project, studentName, status: initialStatus = 'idle', teacher: initialTeacher = null }) {
  const [status, setStatus] = useState(initialStatus) // 'idle' | 'pending' | 'validated'
  const [teacher, setTeacher] = useState(initialTeacher)
  const [open, setOpen] = useState(false)

  // O pop-up vive fora dos estados do cartão: ao enviar, o cartão passa a "à espera"
  // mas o ecrã de confirmação tem de continuar aberto até a pessoa o fechar.
  return (
    <>
      <CardByStatus
        status={status}
        teacher={teacher}
        onRequest={() => setOpen(true)}
        onCancel={() => { setStatus('idle'); setTeacher(null) }}
      />
      {open && (
        <ValidationRequestModal
          project={project}
          studentName={studentName}
          onClose={() => setOpen(false)}
          onSent={(t) => { setTeacher(t); setStatus('pending') }}
        />
      )}
    </>
  )
}

function CardByStatus({ status, teacher, onRequest, onCancel }) {
  if (status === 'validated') {
    return (
      <div style={{ ...S.card, borderColor: 'rgba(42,157,106,0.35)' }}>
        <div style={S.cardHead}>
          <span style={S.iconWrap('var(--color-success)', 'var(--color-success-subtle)')}><Verified size={18} /></span>
          <div>
            <div style={S.eyebrow}>Validado</div>
            <p style={S.cardTitle}>Validado por {teacherLabel(teacher?.name ?? '')}</p>
          </div>
        </div>
        <p style={S.cardBody}>Quem abrir o teu projeto vê o selo de validação.</p>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div style={S.card}>
        <div style={S.cardHead}>
          <span style={S.iconWrap('var(--color-warning)', 'var(--color-warning-subtle)')}><Clock size={18} /></span>
          <div>
            <div style={S.eyebrow}>Validação pedida</div>
            <p style={S.cardTitle}>À espera de {teacherLabel(teacher?.name ?? '')}</p>
          </div>
        </div>
        <p style={S.cardBody}>Pedido enviado para {teacher?.email}. Avisamos-te assim que responder.</p>
        <div style={S.row}>
          <Button variant="secondary" size="sm" disabled title="Podes reenviar ao fim de 7 dias">Reenviar</Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar pedido</Button>
        </div>
        <p style={S.muted}>Podes reenviar se não houver resposta em 7 dias.</p>
      </div>
    )
  }

  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <span style={S.iconWrap()}><GraduationCap size={18} /></span>
        <div>
          <div style={S.eyebrow}>Validação</div>
          <p style={S.cardTitle}>Pede ao teu professor para validar este projeto</p>
        </div>
      </div>
      <p style={S.cardBody}>
        Um projeto validado por um professor mostra a quem o vê que o trabalho é teu e foi acompanhado.
      </p>
      <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={onRequest}>Pedir validação</Button>
    </div>
  )
}

export function ValidationRequestModal({ project, studentName, onClose, onSent }) {
  const [step, setStep] = useState('form') // 'form' | 'sent'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [touched, setTouched] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSend = name.trim().length >= 2 && emailValid
  const greeting = name.trim() ? `Olá, Prof. ${name.trim()}.` : 'Olá, professor(a).'
  const defaultMessage = `${greeting} Fiz o projeto "${project.name}" e gostava que o validasse no Showo. Obrigado!`

  function handleSend() {
    setTouched(true)
    if (!canSend) return
    setSending(true)
    // Protótipo: simula o envio. Na versão real, chama uma edge function.
    setTimeout(() => {
      setSending(false)
      setStep('sent')
      onSent?.({ name: name.trim(), email: email.trim(), subject: subject.trim() })
    }, 900)
  }

  if (step === 'sent') {
    return (
      <Modal onClose={onClose} width={440}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '4px 4px 0' }}>
          <span style={{ ...S.iconWrap('var(--color-success)', 'var(--color-success-subtle)'), width: 52, height: 52, borderRadius: 'var(--radius-lg)' }}>
            <CheckCircle size={26} />
          </span>
          <p style={{ ...S.cardTitle, fontSize: 'var(--text-lg)' }}>Pedido enviado a {teacherLabel(name)}</p>
          <p style={S.cardBody}>Avisamos-te assim que responder. Entretanto, podes continuar a editar o projeto: o professor vê sempre a versão mais recente.</p>
        </div>
        <ol style={{ ...S.steps, marginTop: 20 }}>
          <li style={S.step}><span style={S.stepNum}>1</span>{teacherLabel(name)} recebe um email com o link do projeto.</li>
          <li style={S.step}><span style={S.stepNum}>2</span>Abre o projeto e valida. É grátis para o professor.</li>
          <li style={S.step}><span style={S.stepNum}>3</span>O selo de validação aparece no teu projeto e no teu portefólio.</li>
        </ol>
        <div style={{ marginTop: 20 }}>
          <Button fullWidth onClick={onClose}>Fechar</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      onClose={onClose}
      width={520}
      title="Pedir validação ao professor"
      subtitle="Enviamos um email ao teu professor com o link do projeto."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={S.row}>
          <Input
            label="Nome do professor"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex.: Ana Ferreira"
            required
            error={touched && name.trim().length < 2 ? 'Escreve o nome do professor.' : undefined}
            style={{ flex: 1 }}
          />
          <Input
            label="Disciplina"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Opcional"
            style={{ flex: 1 }}
          />
        </div>
        <Input
          label="Email do professor"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="nome@escola.pt"
          required
          error={touched && !emailValid ? 'Confirma o email.' : undefined}
          hint="Só usamos este email para enviar este pedido."
        />
        <Input
          label="Mensagem"
          type="textarea"
          rows={3}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={defaultMessage}
          hint="Se deixares em branco, enviamos a mensagem acima."
        />

        <div style={S.preview}>
          <span style={S.previewLabel}>O que o professor recebe</span>
          <span style={S.previewSubject}>
            <Mail size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {studentName} pediu-lhe para validar um projeto
          </span>
          <p style={{ ...S.cardBody, fontStyle: 'italic' }}>“{message.trim() || defaultMessage}”</p>
          <div style={S.previewProject}>
            <span style={S.thumb} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>{project.name}</div>
              <div style={S.muted}>{[...new Set([project.area, subject.trim()].filter(Boolean))].join(' · ') || 'Projeto no Showo'}</div>
            </div>
          </div>
          <span style={S.fakeBtn}>Ver e validar projeto</span>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} loading={sending} disabled={sending} iconRight={!sending && <ArrowRight size={15} />}>
            Enviar pedido
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Selo no cabeçalho do projeto, ao lado dos outros estados (mesmo estilo do review_status).
export function ValidationBadge({ status }) {
  if (status !== 'pending' && status !== 'validated') return null
  const cfg = status === 'validated'
    ? { tone: '42,157,106', color: 'var(--color-success)', icon: <Verified size={12} />, label: 'Validado por professor' }
    : { tone: '196,154,32', color: 'var(--color-warning)', icon: <Clock size={12} />, label: 'Validação pedida' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `rgba(${cfg.tone},0.1)`, color: cfg.color,
      border: `1px solid rgba(${cfg.tone},0.25)`,
      borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 700, lineHeight: 1.5,
    }}>
      {cfg.icon}{cfg.label}
    </span>
  )
}
