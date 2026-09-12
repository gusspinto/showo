/* ══════════════════════════════════════════════════════════════════════════
   CHECK PONTUAL DO ESTADO REAL NO RESEND — não depende de termos guardado o
   resend_id (útil para o envio de 94 emails que aconteceu antes de isso
   existir). Usa GET /emails do Resend (lista os mais recentes, paginado) e
   cruza pelo destinatário. Só para diagnóstico manual, protegido pelo mesmo
   CRON_SECRET das outras funções internas.
   ══════════════════════════════════════════════════════════════════════════ */

Deno.serve(async (req) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const provided = req.headers.get('x-cron-secret')
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const { emails, max_pages } = await req.json()
    const targetEmails = new Set((emails as string[]).map(e => e.toLowerCase()))
    const maxPages = max_pages ?? 15

    const found = new Map<string, string>() // email -> last_event
    let after: string | null = null

    for (let page = 0; page < maxPages && found.size < targetEmails.size; page++) {
      const url = new URL('https://api.resend.com/emails')
      if (after) url.searchParams.set('after', after)
      const res = await fetch(url, { headers: { Authorization: `Bearer ${resendKey}` } })
      if (!res.ok) break
      const body = await res.json()
      const items = body.data ?? []
      if (items.length === 0) break

      for (const item of items) {
        const to = Array.isArray(item.to) ? item.to[0] : item.to
        const toLower = String(to ?? '').toLowerCase()
        if (targetEmails.has(toLower) && !found.has(toLower)) {
          found.set(toLower, item.last_event ?? 'unknown')
        }
      }
      after = items[items.length - 1]?.id ?? null
      if (!after) break
    }

    const byStatus: Record<string, number> = {}
    for (const status of found.values()) {
      byStatus[status] = (byStatus[status] ?? 0) + 1
    }

    const notFound = [...targetEmails].filter(e => !found.has(e))

    return new Response(JSON.stringify({
      checked: targetEmails.size,
      found: found.size,
      not_found_in_recent_list: notFound.length,
      by_status: byStatus,
    }))
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
