import { createContext, useContext, useState, useCallback } from 'react'

const SidebarContext = createContext({ extras: null, setExtras: () => {} })

export function SidebarProvider({ children }) {
  const [extras, setExtrasRaw] = useState(null)
  const setExtras = useCallback(v => setExtrasRaw(v), [])
  return (
    <SidebarContext.Provider value={{ extras, setExtras }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
