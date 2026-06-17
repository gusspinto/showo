import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const saved = localStorage.getItem('showo_theme')
  const [theme, setTheme] = useState(saved || 'dark')

  useEffect(() => {
    // If the user never set a preference, pick based on auth state
    if (saved) return
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) setTheme('light')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light')
    // Only persist when the user explicitly toggled — not the auto-detection above
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('showo_theme', next)
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
