// Markdown leve (negrito, itálico, links, listas com "- ") usado nas
// respostas do Coach IA, partilhado entre o chat dentro do projeto e o
// Coach global.
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
    // Link tem de vir primeiro na alternativa: "**" dentro de "[texto]" não
    // deve ser apanhado pelo negrito antes do link ser reconhecido.
    const re = /(\[(.+?)\]\((https?:\/\/[^\s)]+)\))|(\*\*(.+?)\*\*)|(\*(.+?)\*)/g
    let last = 0, m
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index))
      if (m[1]) parts.push(<a key={m.index} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>)
      else if (m[4]) parts.push(<strong key={m.index}>{m[5]}</strong>)
      else parts.push(<em key={m.index}>{m[7]}</em>)
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
