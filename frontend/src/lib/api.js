// Thin wrapper around our REST API. Auth headers and token refresh are added
// by the interceptors in session.js.
import axios from "axios"
import config from "../config"

const base = `${config.apiUrl}/api`

const get = (path, params) => axios.get(`${base}${path}`, { params }).then((r) => r.data)
const send = (method, path, data) => axios({ method, url: `${base}${path}`, data }).then((r) => r.data)

const toFormData = (values) => {
  const form = new FormData()
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (value instanceof File) form.append(key, value)
    else if (typeof value === "object") form.append(key, JSON.stringify(value))
    else form.append(key, value)
  })
  return form
}

const api = {
  login: (code) => get("/callback", { code }),
  me: () => get("/users/update/"),
  updateMe: (data) => send("put", "/users/update/", data),

  portfolio: (handle) => get(`/portfolio/${encodeURIComponent(handle)}/`),
  portfolioProject: (handle, slug) =>
    get(`/portfolio/${encodeURIComponent(handle)}/projects/${encodeURIComponent(slug)}/`),

  projects: () => get("/projects/"),
  userProjects: (username) => get(`/projects/user/${encodeURIComponent(username)}/`),
  createProject: (values) => send("post", "/projects/", toFormData(values)),
  updateProject: (id, values) => send("patch", `/projects/${id}/`, toFormData(values)),
  deleteProject: (id) => send("delete", `/projects/${id}/`),
  reorderProjects: (items) => send("post", "/projects/reorder/", items),
  like: (id) => send("post", `/projects/${id}/like/`),

  comments: (projectId) => get(`/projects/${projectId}/comments/`),
  addComment: (projectId, content) => send("post", `/projects/${projectId}/comments/`, { content }),
  deleteComment: (projectId, id) => send("delete", `/projects/${projectId}/comments/${id}/`),
  hideComment: (projectId, id) => send("post", `/projects/${projectId}/comments/${id}/hide/`),

  users: () => get("/users"),
  mapUsers: () => get("/users_with_profiles/"),
  communities: () => get("/communities/"),
  community: (slug) => get(`/communities/${encodeURIComponent(slug)}/`),
}

export default api
