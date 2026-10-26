import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { jwtDecode } from "jwt-decode"
import config from "./src/config"
import { clearSession } from "./src/lib/session"

export function handleAuth() {
  const params = new URLSearchParams({ client_id: config.githubClientId, scope: config.githubScope })
  window.location.href = `https://github.com/login/oauth/authorize?${params}`
}

export const handleLogout = async ({ setUser }) => {
  clearSession()
  setUser({ is_authenticated: false })
}

// Log the user out when the *refresh* token expires (access tokens are renewed automatically).
export const useAuthTokenExpiration = (refreshToken, setUser) => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!refreshToken) return

    let expiresAt
    try {
      expiresAt = jwtDecode(refreshToken).exp * 1000
    } catch {
      expiresAt = 0
    }
    const logout = () => {
      handleLogout({ setUser })
      navigate("/")
    }
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      logout()
      return
    }
    // setTimeout overflows above ~24.8 days; refresh tokens last 14 days by default.
    const timer = setTimeout(logout, Math.min(remaining, 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [refreshToken, setUser, navigate])
}
