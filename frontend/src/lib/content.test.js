import { describe, expect, it } from "vitest"
import { collaborators, formatPeriod, initials, localizeProfile, localizeProject, projectYear, skillsFrom, splitTags } from "./content"

describe("content helpers", () => {
  it("lists collaborators without the page owner and without duplicate invites", () => {
    const project = {
      users: [
        { username: "pesho2k", full_name: "" },
        { username: "bravemaster3", handle: "bravemaster3", full_name: "Koffi" },
        { username: "olakunle64", handle: "olakunle64", full_name: "Salau Olakunle" },
      ],
      invites: [
        { github_username: "pesho2k", status: "pending" },
        { github_username: "newfriend", status: "pending" },
        { github_username: "gone", status: "declined" },
      ],
    }
    expect(collaborators(project, { username: "bravemaster3" })).toEqual([
      { key: "pesho2k", name: "pesho2k", handle: "pesho2k" },
      { key: "olakunle64", name: "Salau Olakunle", handle: "olakunle64" },
      { key: "newfriend", name: "@newfriend", handle: null },
    ])
  })

  it("merges skills case-insensitively and sorts by frequency", () => {
    const skills = skillsFrom([{ tags: "Python, React" }, { tags: "python, Leaflet" }, { tags: "React JS" }])
    expect(skills[0]).toEqual({ name: "Python", count: 2 })
    expect(skills.map((s) => s.name)).toEqual(["Python", "Leaflet", "React", "React JS"])
  })

  it("prefers translations and falls back to the original", () => {
    const user = {
      headline: "Developer",
      bio: "Hi",
      default_lang: "en",
      translations: { fr: { headline: "Développeur", bio: "" } },
    }
    expect(localizeProfile(user, "fr")).toMatchObject({ headline: "Développeur", bio: "Hi", isOriginal: false })
    expect(localizeProfile(user, "sv")).toMatchObject({ headline: "Developer", isOriginal: true })
    const project = { projectTitle: "HuHoLa", description: "Maps mires", body: "", translations: { sv: { summary: "Kartlägger" } } }
    expect(localizeProject(project, "sv")).toMatchObject({ title: "HuHoLa", summary: "Kartlägger" })
  })

  it("formats periods per language", () => {
    expect(formatPeriod("2023-11-01", "2025-02-01", "en", "present")).toBe("Nov 2023 – Feb 2025")
    expect(formatPeriod("2023-11-01", null, "en", "present")).toBe("Nov 2023 – present")
    expect(formatPeriod(null, null, "en", "present")).toBe("")
  })

  it("has small helpers", () => {
    expect(splitTags(" a, b ,,c ")).toEqual(["a", "b", "c"])
    expect(initials("ALX Hall of Fame")).toBe("AH")
    expect(projectYear({ created_at: null, period_start: "2022-07-01" })).toBe("2022")
    expect(projectYear({})).toBe("")
  })
})
