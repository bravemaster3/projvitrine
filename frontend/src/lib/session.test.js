import axios from "axios"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { LOGOUT_EVENT, getSession, installSessionInterceptors, saveSession } from "./session"

// Fake transport: each test queues handlers that receive the request config.
let handlers = []
const respond = (config, status, data) => {
  const response = { data, status, statusText: String(status), headers: {}, config }
  if (status >= 400) {
    const error = new axios.AxiosError("fail", "ERR", config, null, response)
    return Promise.reject(error)
  }
  return Promise.resolve(response)
}

beforeAll(() => {
  axios.defaults.adapter = (config) => handlers.shift()(config)
  installSessionInterceptors()
})

afterEach(() => {
  handlers = []
  localStorage.clear()
})

describe("session interceptors", () => {
  it("adds the access token to API calls only", async () => {
    saveSession({ is_authenticated: true, token: "access-1", refresh: "refresh-1" })
    const seen = []
    handlers.push((c) => (seen.push(c.headers.Authorization), respond(c, 200, {})))
    handlers.push((c) => (seen.push(c.headers.Authorization), respond(c, 200, {})))

    await axios.get("/api/projects/")
    await axios.get("https://api.github.com/users/octocat/repos")

    expect(seen).toEqual(["Bearer access-1", undefined])
  })

  it("refreshes an expired access token once and retries", async () => {
    saveSession({ is_authenticated: true, token: "old", refresh: "refresh-1" })
    handlers.push((c) => respond(c, 401, {}))
    handlers.push((c) => {
      expect(JSON.parse(c.data)).toEqual({ refresh: "refresh-1" })
      return respond(c, 200, { access: "new", refresh: "refresh-2" })
    })
    handlers.push((c) => {
      expect(c.headers.Authorization).toBe("Bearer new")
      return respond(c, 200, { ok: true })
    })

    const response = await axios.get("/api/users/update/")

    expect(response.data).toEqual({ ok: true })
    expect(getSession()).toMatchObject({ token: "new", refresh: "refresh-2" })
  })

  it("logs out when the refresh token is rejected", async () => {
    saveSession({ is_authenticated: true, token: "old", refresh: "expired" })
    const onLogout = vi.fn()
    window.addEventListener(LOGOUT_EVENT, onLogout)
    handlers.push((c) => respond(c, 401, {}))
    handlers.push((c) => respond(c, 401, {}))

    await expect(axios.get("/api/users/update/")).rejects.toBeTruthy()

    expect(getSession()).toEqual({ is_authenticated: false })
    expect(onLogout).toHaveBeenCalledOnce()
    window.removeEventListener(LOGOUT_EVENT, onLogout)
  })

  it("does not try to refresh for anonymous visitors", async () => {
    handlers.push((c) => respond(c, 401, {}))
    await expect(axios.get("/api/projects/")).rejects.toMatchObject({ response: { status: 401 } })
    expect(handlers).toHaveLength(0)
  })
})
