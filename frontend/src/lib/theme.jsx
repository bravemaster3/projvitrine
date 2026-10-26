import { createContext, useCallback, useContext, useEffect, useState } from "react"

const STORAGE_KEY = "theme"
const ThemeContext = createContext({ mode: "system", resolved: "light", setMode: () => {} })

const systemTheme = () => (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")

const readMode = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "system"
  } catch {
    return "system"
  }
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readMode)
  const [system, setSystem] = useState(systemTheme)
  const resolved = mode === "system" ? system : mode

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)")
    const onChange = () => setSystem(systemTheme())
    query?.addEventListener?.("change", onChange)
    return () => query?.removeEventListener?.("change", onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  const setMode = useCallback((next) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // not remembered in private mode
    }
  }, [])

  return <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
