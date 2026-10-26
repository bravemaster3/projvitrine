import { describe, expect, it } from "vitest"
import { formatPeriod, initials, localizeProfile, localizeProject, projectYear, skillsFrom, splitTags } from "./content"

describe("content helpers", () => {
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
