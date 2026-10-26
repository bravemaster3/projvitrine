import { useCallback, useEffect, useState } from "react"

// Load data on mount / when deps change. Returns { data, error, loading, reload, setData }.
export default function useApi(load, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const run = useCallback(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    load()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: null, error, loading: false }))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])

  const setData = useCallback((update) => {
    setState((s) => ({ ...s, data: typeof update === "function" ? update(s.data) : update }))
  }, [])

  return { ...state, reload: run, setData }
}
