import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/utilities.css'
import './index.css'
import { initErrorTracking } from './lib/errorTracking'
import { initAnalytics } from './lib/analytics'
import { hasConsented } from './lib/consent'

if (hasConsented()) {
  initErrorTracking()
  initAnalytics()
}

// Rotate selection highlight color through brand tricolor on each new selection
;(function () {
  const colors = [
    ['rgba(196,154,32,0.40)', '#fff'],
    ['rgba(224,72,72,0.40)',  '#fff'],
    ['rgba(43,126,245,0.40)', '#fff'],
  ]
  let i = 0
  let wasEmpty = true
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection()
    const empty = !sel || sel.isCollapsed
    if (!empty && wasEmpty) {
      i = (i + 1) % colors.length
      const root = document.documentElement.style
      root.setProperty('--sel-bg',    colors[i][0])
      root.setProperty('--sel-color', colors[i][1])
    }
    wasEmpty = empty
  })
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
