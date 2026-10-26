import { describe, expect, it } from "vitest"
import en from "./en.json"
import fr from "./fr.json"
import sv from "./sv.json"

const keys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))
const placeholders = (text) => (text.match(/{{\s*\w+\s*}}/g) || []).sort()
const lookup = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj)

describe.each([
  ["fr", fr],
  ["sv", sv],
])("%s translations", (_, locale) => {
  it("have exactly the same keys as English", () => {
    expect(keys(locale).sort()).toEqual(keys(en).sort())
  })

  it("keep the same {{placeholders}}", () => {
    for (const key of keys(en)) {
      expect(placeholders(lookup(locale, key)), key).toEqual(placeholders(lookup(en, key)))
    }
  })
})
