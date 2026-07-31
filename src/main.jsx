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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
