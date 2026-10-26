import config from "./src/config"
import countries from "./src/data/countries.json"

// Legacy ALX cohort list; replaced by communities in phase 2.
export const allCohorts = { "Non-ALX": "Non-ALX" }
for (let i = 1; i <= 21; i++) {
  allCohorts[`C${i}`] = `ALX Cohort ${i}`
}

export const backendURL = config.apiUrl
export const frontendURL = config.siteUrl
export const githubClientID = config.githubClientId

// Country name -> { name, latlng }, bundled locally (restcountries v3.1 was retired).
const allCountries = Object.fromEntries(
  Object.entries(countries).map(([name, latlng]) => [name, { name, latlng }])
)

export const fetchAllCountries = async () => allCountries
