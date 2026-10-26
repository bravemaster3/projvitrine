import { Component } from "react"
import { withTranslation } from "react-i18next"
import { CircleAlert } from "lucide-react"
import { EmptyState } from "../ui/Feedback"

/** Shows a friendly message instead of a blank page if a component crashes. */
class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack)
  }

  render() {
    const { t, children } = this.props
    if (!this.state.error) return children
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={CircleAlert}
          title={t("errors.generic")}
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-full bg-accent px-4 font-semibold text-on-accent"
            >
              {t("errors.reload")}
            </button>
          }
        >
          {t("errors.genericBody")}
        </EmptyState>
      </div>
    )
  }
}

export default withTranslation()(ErrorBoundary)
