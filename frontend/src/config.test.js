import { afterEach, describe, expect, it, vi } from "vitest"
import countries from "./data/countries.json"

const loadConfig = async () => {
  vi.resetModules()
  return (await import("./config")).default
}

afterEach(() => {
  delete window.__APP_CONFIG__
})

describe("config", () => {
  it("has defaults when nothing is configured", async () => {
    const config = await loadConfig()
    expect(config.apiUrl).toBe("")
    expect(config.brandName).toBe("Proofolio")
    expect(config.langs).toEqual(["en", "fr", "sv"])
    expect(config.siteUrl).toBe(window.location.origin)
    expect(config.githubScope).toBe("read:user user:email")
  })

  it("uses settings written by the web container at start-up", async () => {
    window.__APP_CONFIG__ = {
      siteUrl: "https://proofolio.kndev.org/",
      brandName: "Proofolio",
      githubClientId: "abc123",
      langs: "en, fr",
      apiUrl: "",
    }
    const config = await loadConfig()
    expect(config.siteUrl).toBe("https://proofolio.kndev.org")
    expect(config.githubClientId).toBe("abc123")
    expect(config.langs).toEqual(["en", "fr"])
  })

  it("ignores blank runtime values", async () => {
    window.__APP_CONFIG__ = { brandName: "  ", siteUrl: "" }
    const config = await loadConfig()
    expect(config.brandName).toBe("Proofolio")
    expect(config.siteUrl).toBe(window.location.origin)
  })
})

describe("countries", () => {
  it("are bundled with coordinates for the locations used on the map", () => {
    for (const name of ["Egypt", "Ghana", "Kenya", "Malawi", "Morocco", "Nigeria", "South Africa", "Sweden", "Togo"]) {
      expect(countries[name]).toHaveLength(2)
    }
  })
})
