import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   AVISO ÚNICO para as 11 contas reais que ficaram sem perfil entre
   2026-09-13 e 2026-09-18 por causa do bug do search_path do
   ensure_ics_token() (ver migration 173). Os perfis já foram reparados
   diretamente na base de dados — isto é só para convidar as pessoas a
   voltar, já que a maioria entrou uma vez, encontrou a app quebrada, e
   nunca mais voltou sem se queixar.

   Não é recorrente, não tem cron. Lista de destinatários fixa, hardcoded
   abaixo (não é um critério reaproveitável para o futuro).

   Modo de teste: { test_user_id } no corpo.
   ══════════════════════════════════════════════════════════════════════════ */

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'

// As 12 contas afetadas, exceto a conta de fundador (hello@showo.pt).
const AFFECTED_USER_IDS = [
  '97ec56cd-f93a-4db9-8648-2ab3413ad5b0', // Diogo Martin
  '8a96d8b8-6a65-418d-bb48-816e6c7e890a', // Renato Silva
  '5c2e96ae-b15c-467f-83ab-5afa7549e83d', // Afonso Canaveira
  '1c020b76-1bff-48fb-ae1d-9dd43ca49f11', // vasco silva
  'bae46ae4-6539-4a1a-b679-8edd03a69b72', // Gustavo Faria
  '2c0d7120-aee3-47aa-a16e-3fb9a3f05065', // Edgar
  '47a634f7-f2ec-433a-a6e3-e53d187ee31f', // Francisco Simões
  '8f94c090-a58a-406c-868a-d0b617fd2ef9', // Guilherme S
  'a5960f0d-d010-43d0-9d87-280eff3c4a39', // Leonor Fernandes
  '5c986fae-83c4-4b13-939c-e8e12d72c09f', // Tomás Santos
  '3e4c4833-89b3-4d21-89a6-10f0f7dd3561', // Dinis Pinto
]

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

async function signUserId(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(userId))
  return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function buildHtml(opts: { firstName?: string; unsubscribeUrl: string }) {
  const { firstName, unsubscribeUrl } = opts
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;"><img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;border:0;" /></td></tr>
        ${firstName ? `<tr><td style="padding:0 0 16px;color:#888888;font-size:16px;line-height:1.4;">${esc(firstName)},</td></tr>` : ''}
        <tr><td style="padding:0 0 24px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">Tivemos um erro técnico quando te registaste. Já está corrigido.</td></tr>
        <tr><td style="padding:0 0 10px;color:#888888;font-size:16px;line-height:1.5;">Quando criaste a tua conta no Showo, um bug nosso impediu o teu perfil de ficar completo. Provavelmente entraste e encontraste a app vazia ou com erro.</td></tr>
        <tr><td style="padding:0 0 32px;color:#888888;font-size:16px;line-height:1.5;">A culpa foi nossa, não tua. Já corrigimos o bug e já arranjámos a tua conta, sem precisares de fazer nada. Entra outra vez e devia estar tudo a funcionar.</td></tr>
        <tr><td style="padding:0 0 40px;"><a href="${APP}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">Entrar no Showo</a></td></tr>
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar emails de campanhas</a></td></tr>
      </table>
    </td>
  </tr>
</table>`
}

Deno.serve(async (req) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const provided = req.headers.get('x-cron-secret')
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    let testUserId: string | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
    } catch { /* corpo vazio é normal */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const targetIds = testUserId ? [testUserId] : AFFECTED_USER_IDS
    let sent = 0
    const errors: string[] = []

    for (const userId of targetIds) {
      try {
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId)
        if (userErr || !userData?.user?.email) continue

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()

        const unsubSig = await signUserId(userId, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${userId}&sig=${unsubSig}`
        const html = buildHtml({ firstName: profile?.full_name?.split(' ')[0], unsubscribeUrl })

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: userData.user.email,
            subject: 'Corrigimos um erro na tua conta Showo',
            html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        })
        if (!res.ok) { errors.push(`${userData.user.email}: ${await res.text()}`); continue }

        const { id: resendId } = await res.json()
        if (resendId) {
          await supabase.from('email_sends').insert({
            user_id: userId,
            email_type: 'signup_bug_fix_notice',
            resend_id: resendId,
            to_email: userData.user.email,
          })
        }
        sent++
      } catch (e) {
        errors.push(`${userId}: ${String(e)}`)
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, sent, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.', detail: String(e) }), { status: 500 })
  }
})
