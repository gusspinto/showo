// Markdown leve (negrito, itálico, listas com "- ") usado nas respostas do
// Coach IA — partilhado entre o chat dentro do projeto e o Coach global.
export function renderMd(text) {
  const lines = text.split('\n')
  const out = []
  let listItems = []
  let k = 0
  function flush() {
    if (!listItems.length) return
    out.push(<ul key={k++} style={{ margin: '4px 0 4px 4px', paddingLeft: 16, listStyleType: 'disc' }}>{listItems}</ul>)
    listItems = []
  }
  function inline(line) {
    const parts = []
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
    let last = 0, m
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index))
      if (m[0].startsWith('**')) parts.push(<strong key={m.index}>{m[2]}</strong>)
      else parts.push(<em key={m.index}>{m[3]}</em>)
      last = m.index + m[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return parts
  }
  for (const line of lines) {
    const isBullet = line.startsWith('- ') || line.startsWith('• ')
    if (isBullet) { listItems.push(<li key={k++}>{inline(line.slice(2))}</li>); continue }
    flush()
    if (line === '') { out.push(<br key={k++} />); continue }
    out.push(<span key={k++} style={{ display: 'block' }}>{inline(line)}</span>)
  }
  flush()
  return out
}
