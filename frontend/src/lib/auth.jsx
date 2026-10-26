import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { jwtDecode } from "jwt-decode"
import config from "../config"
import api from "./api"
import { LOGOUT_EVENT, clearSession, getSession, saveSession } from "./session"

const AuthContext = createContext(null)

export const startGithubLogin = () => {
  const params = new URLSearchParams({ client_id: config.githubClientId, scope: config.githubScope })
  // Remember where to come back to after GitHub redirects to the site.
  try {
    sessionStorage.setItem("login:return", window.location.pathname)
  } catch {
    // ignore
  }
  window.location.href = `https://github.com/login/oauth/authorize?${params}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession)
  const [pending, setPending] = useState(() => new URLSearchParams(window.location.search).has("code"))
  const [error, setError] = useState(null)
  const usedCode = useRef(null)
  const navigate = useNavigate()

  const update = useCallback((next) => {
    saveSession(next)
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(getSession())
  }, [])

  // GitHub redirects back with ?code=… to whatever page is configured; handle it anywhere.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    if (!code || usedCode.current === code) return
    usedCode.current = code
    params.delete("code")
    params.delete("state")
    const clean = `${window.location.pathname}${params.size ? `?${params}` : ""}`
    window.history.replaceState(null, "", clean)

    api
      .login(code)
      .then((data) => {
        update(data)
        let target = "/dashboard"
        try {
          target = sessionStorage.getItem("login:return") || target
          sessionStorage.removeItem("login:return")
        } catch {
          // ignore
        }
        if (!data.updated) target = "/settings/profile?welcome=1"
        else if (target === "/login") target = "/dashboard"
        navigate(target, { replace: true })
      })
      .catch(() => setError("login_failed"))
      .finally(() => setPending(false))
  }, [navigate, update])

  // Storage cleared by a failed refresh → reflect it.
  useEffect(() => {
    const onLogout = () => setSession(getSession())
    window.addEventListener(LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout)
  }, [])

  // Log out when the refresh token expires (access tokens renew automatically).
  useEffect(() => {
    if (!session.refresh) return
    let expiresAt = 0
    try {
      expiresAt = jwtDecode(session.refresh).exp * 1000
    } catch {
      expiresAt = 0
    }
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      logout()
      return
    }
    const timer = setTimeout(logout, Math.min(remaining, 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [session.refresh, logout])

  const refreshMe = useCallback(async () => {
    const me = await api.me()
    update({ ...getSession(), ...me })
    return me
  }, [update])

  const value = {
    user: session.is_authenticated ? session : null,
    pending,
    error,
    login: startGithubLogin,
    logout,
    refreshMe,
    setUser: (data) => update({ ...getSession(), ...data }),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
