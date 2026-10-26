import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import i18n from "../lib/i18n"
import api from "../lib/api"
import { AuthProvider } from "../lib/auth"
import { ToastProvider } from "../components/ui/Toast"
import Portfolio from "./Portfolio"

vi.mock("../lib/api", () => ({ default: { portfolio: vi.fn() } }))

const user = {
  id: 1,
  username: "bravemaster3",
  handle: "bravemaster3",
  full_name: "Koffi Dodji Noumonvi",
  headline: "Full-stack geospatial developer",
  bio: "Always ready to help.",
  location: "Sweden",
  default_lang: "en",
  open_to_work: true,
  avatar: null,
  linkedin: "https://linkedin.com/in/k",
  memberships: [{ community: "alx", community_name: "ALX", label: "Cohort 16" }],
  translations: { fr: { headline: "Développeur géospatial full-stack", bio: "" } },
}

const project = (id, title, tags, extra = {}) => ({
  id,
  projectTitle: title,
  slug: title.toLowerCase(),
  description: `${title} summary`,
  tags,
  users: [user],
  user,
  links: [{ kind: "code", url: `https://github.com/x/${title}` }],
  likes_count: 2,
  translations: {},
  ...extra,
})

const renderPortfolio = () =>
  render(
    <MemoryRouter initialEntries={["/u/bravemaster3"]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/u/:handle" element={<Portfolio />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  )

describe("Portfolio page", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en")
    api.portfolio.mockResolvedValue({
      user,
      projects: [
        project(4, "HuHoLa", "Python, Peatlands", { featured: true }),
        project(5, "PostEddyPro", "R, Carbon flux", {
          users: [user, { username: "olakunle64", handle: "olakunle64", full_name: "Salau Olakunle" }],
        }),
        project(7, "MiresChrono", "Leaflet, Peatlands"),
      ],
    })
  })

  it("shows the profile, communities and permalink", async () => {
    renderPortfolio()
    expect(await screen.findByRole("heading", { level: 1, name: "Koffi Dodji Noumonvi" })).toBeInTheDocument()
    expect(screen.getByText("Full-stack geospatial developer")).toBeInTheDocument()
    expect(screen.getByText("ALX · Cohort 16")).toBeInTheDocument()
    expect(screen.getByText("Open to collaborations")).toBeInTheDocument()
    expect(screen.getByText(/\/u\/bravemaster3$/)).toBeInTheDocument()
    await waitFor(() => expect(document.title).toContain("Koffi Dodji Noumonvi"))
  })

  it("features the flagged project first and filters the index by skill", async () => {
    renderPortfolio()
    const featured = await screen.findByRole("region", { name: "Featured work" })
    expect(within(featured).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("HuHoLa")

    const index = screen.getByRole("region", { name: /All projects/ })
    const titles = () => within(index).getAllByRole("link").filter((a) => a.closest("p") === null).map((a) => a.textContent)
    expect(titles()).toEqual(["HuHoLa", "PostEddyPro", "MiresChrono"])
    // collaborators are credited in the index too
    expect(within(index).getByRole("link", { name: "Salau Olakunle" })).toHaveAttribute("href", "/u/olakunle64")
    await userEvent.click(screen.getByRole("button", { name: /Peatlands/ }))
    expect(titles()).toEqual(["HuHoLa", "MiresChrono"])
  })

  it("has no featured section when nothing is featured", async () => {
    api.portfolio.mockResolvedValue({ user, projects: [project(5, "PostEddyPro", "R"), project(7, "MiresChrono", "Leaflet")] })
    renderPortfolio()
    expect(await screen.findByRole("region", { name: /All projects/ })).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Featured work" })).not.toBeInTheDocument()
  })

  it("shortens long collaborator lists", async () => {
    const people = ["ana", "ben", "cy", "dee", "eve"].map((name) => ({ username: name, handle: name, full_name: name.toUpperCase() }))
    api.portfolio.mockResolvedValue({ user, projects: [project(5, "PostEddyPro", "R", { users: [user, ...people] })] })
    renderPortfolio()
    const index = await screen.findByRole("region", { name: /All projects/ })
    expect(within(index).getByText(/\+2 more/)).toBeInTheDocument()
    expect(within(index).queryByRole("link", { name: "EVE" })).not.toBeInTheDocument()
  })

  it("leads 'Get in touch' to the owner's choice, or hides it", async () => {
    api.portfolio.mockResolvedValue({ user: { ...user, contact: { via: "linkedin", href: "https://linkedin.com/in/k" } }, projects: [] })
    const { unmount } = renderPortfolio()
    const buttons = await screen.findAllByRole("link", { name: /Get in touch/ })
    buttons.forEach((b) => expect(b).toHaveAttribute("href", "https://linkedin.com/in/k"))
    expect(screen.getByText("Have a project in mind?")).toBeInTheDocument()
    unmount()

    api.portfolio.mockResolvedValue({ user: { ...user, contact: null }, projects: [] })
    renderPortfolio()
    await screen.findByRole("heading", { level: 1 })
    expect(screen.queryByText(/Get in touch/)).not.toBeInTheDocument()
    expect(screen.queryByText("Have a project in mind?")).not.toBeInTheDocument()
  })

  it("switches the interface and headline language", async () => {
    renderPortfolio()
    await screen.findByRole("heading", { level: 1 })
    await i18n.changeLanguage("fr")
    expect(await screen.findByText("Développeur géospatial full-stack")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Projets phares" })).toBeInTheDocument()
  })

  it("shows a not-found state", async () => {
    api.portfolio.mockRejectedValue({ response: { status: 404 } })
    renderPortfolio()
    expect(await screen.findByText("Portfolio not found")).toBeInTheDocument()
  })
})
