import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom"
import Navbar from "./navbar/Navbar"
import Footer from "./footer/Footer"
import Home from "./pages/Home"
import About from "./pages/About"
import Profile from "./pages/Profile"
import ProfileEdit from "./pages/ProfileEdit"
import Login from "./pages/Login"
import UsersMap from "./pages/UsersMap"
import Portfolio from "./pages/Portfolio"
import { useEffect, useState } from "react"
import People from "./pages/People"
import { LOGOUT_EVENT } from "./lib/session"

const AppContent = () => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user")
    return storedUser ? JSON.parse(storedUser) : { is_authenticated: false }
  })

  const location = useLocation()

  // The session layer clears storage when a refresh fails; mirror that in state.
  useEffect(() => {
    const onLogout = () => setUser({ is_authenticated: false })
    window.addEventListener(LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout)
  }, [])

  // Define the routes that should not display the Navbar and Footer
  const noNavbarFooterRoutes = ["/portfolios/:github_username"]
  const noFooterRoutes = ["/map"]

  // Check if the current route matches any of the routes in the noNavbarFooterRoutes array
  const showNavbarFooter = !noNavbarFooterRoutes.some((route) =>
    location.pathname.match(new RegExp(`^${route.replace(/:\w+/, "\\w+")}$`))
  )

  const showFooter = !noFooterRoutes.some((route) =>
    location.pathname.match(new RegExp(`^${route.replace(/:\w+/, "\\w+")}$`))
  )

  return (
    <div className="m-0 w-full min-h-screen bg-gray-100 dark:bg-dark-white flex flex-col justify-between">
      {showNavbarFooter && <Navbar user={user} setUser={setUser} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/map" element={<UsersMap />} />
        <Route path="/people" element={<People />} />
        <Route path="/portfolios/:github_username" element={<Portfolio />} />
      </Routes>
      {showNavbarFooter && showFooter && <Footer />}
    </div>
  )
}

const App = () => {
  useEffect(() => {
    // Apply dark mode based on stored preference or system settings
    const theme = localStorage.getItem("theme")
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark")
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
