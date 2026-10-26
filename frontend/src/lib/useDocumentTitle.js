import { useEffect } from "react"
import config from "../config"

/** Sets the tab title while the page is shown (null = brand name). */
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title || config.brandName
  }, [title])
}
