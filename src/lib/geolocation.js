let cached = null

export async function getGeoInfo() {
  if (cached) return cached
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
