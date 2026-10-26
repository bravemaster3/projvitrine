// Session storage and automatic access-token refresh for calls to our API.
import axios from "axios"
import config from "../config"

const STORAGE_KEY = "user"
const LOGGED_OUT = { is_authenticated: false }
export const LOGOUT_EVENT = "auth:logout"

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || LOGGED_OUT
  } catch {
    return LOGGED_OUT
  }
}

export const saveSession = (session) => localStorage.setItem(STORAGE_KEY, JSON.stringify(session))

export const clearSession = () => {
  saveSession(LOGGED_OUT)
  window.dispatchEvent(new Event(LOGOUT_EVENT))
}

const apiPrefix = `${config.apiUrl}/api/`
const isApiRequest = (url = "") =>
  url.startsWith(apiPrefix) || (!config.apiUrl && url.startsWith("/api/"))
const isRefreshRequest = (url = "") => url.includes("/api/token/refresh/")

let refreshing = null

const refreshAccessToken = async () => {
  const session = getSession()
  if (!session.refresh) throw new Error("No refresh token")
  // Plain axios call without the interceptors' retry logic.
  const { data } = await axios.post(`${config.apiUrl}/api/token/refresh/`, { refresh: session.refresh })
  saveSession({ ...session, token: data.access, refresh: data.refresh || session.refresh })
  return data.access
}

export const installSessionInterceptors = () => {
  // Always send the current access token to our API (never to third parties like GitHub).
  axios.interceptors.request.use((request) => {
    const { token } = getSession()
    if (token && isApiRequest(request.url) && !isRefreshRequest(request.url)) {
      request.headers.Authorization = `Bearer ${token}`
    }
    return request
  })

  axios.interceptors.response.use(undefined, async (error) => {
    const request = error.config
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retried ||
      !isApiRequest(request.url) ||
      isRefreshRequest(request.url) ||
      !getSession().refresh
    ) {
      return Promise.reject(error)
    }
    try {
      refreshing = refreshing || refreshAccessToken()
      const token = await refreshing
      request._retried = true
      request.headers.Authorization = `Bearer ${token}`
      return axios(request)
    } catch (refreshError) {
      clearSession()
      return Promise.reject(refreshError)
    } finally {
      refreshing = null
    }
  })
}
