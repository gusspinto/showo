export function getAreaColor(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('educa')) return 'var(--color-info-subtle)'
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas')) return 'var(--color-primary-subtle)'
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software')) return 'var(--color-surface-alt)'
  if (a.includes('saúde') || a.includes('saude') || a.includes('medical') || a.includes('bio')) return 'var(--color-success-subtle)'
  return 'var(--color-surface-alt)'
}
