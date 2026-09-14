let cached = null
let attempted = false

export async function getGeoInfo() {
  if (cached) return cached
  if (attempted) return null
  attempted = true
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return null
    const data = await res.json()
    cached = {
      country: data.country_name || null,
      city: data.city || null,
    }
    return cached
  } catch {
    return null
  }
}

/* Cidade do visitante para as notificações de visualização (perfil/projeto).
   ip-api.com só serve HTTP no plano gratuito e devolve 403 em HTTPS — nunca
   funcionou em produção. ipapi.co é HTTPS-nativo; falha sempre para
   "Portugal" em vez de rebentar a chamada de notificação. */
export async function getVisitorCity() {
  const geo = await getGeoInfo()
  return geo?.city || 'Portugal'
}
