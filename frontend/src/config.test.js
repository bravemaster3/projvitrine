import { describe, expect, it } from "vitest"
import config from "./config"
import { fetchAllCountries } from "../constants"

describe("config", () => {
  it("has defaults when no VITE_* variables are set", () => {
    expect(config.apiUrl).toBe("")
    expect(config.brandName).toBe("Showcase")
    expect(config.langs).toEqual(["en", "fr", "sv"])
    expect(config.githubScope).toBe("read:user user:email")
  })
})

describe("countries", () => {
  it("are bundled with coordinates for the locations used on the map", async () => {
    const countries = await fetchAllCountries()
    for (const name of ["Egypt", "Ghana", "Kenya", "Malawi", "Morocco", "Nigeria", "South Africa", "Sweden", "Togo"]) {
      expect(countries[name].latlng).toHaveLength(2)
    }
  })
})
