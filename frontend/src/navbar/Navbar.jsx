import * as React from "react"
import { useNavigate } from "react-router-dom"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Toolbar from "@mui/material/Toolbar"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import Menu from "@mui/material/Menu"
import MenuIcon from "@mui/icons-material/Menu"
import Container from "@mui/material/Container"
import Avatar from "@mui/material/Avatar"
import Button from "@mui/material/Button"
import Tooltip from "@mui/material/Tooltip"
import MenuItem from "@mui/material/MenuItem"
import AdbIcon from "@mui/icons-material/Adb"
import GithubBtn from "./GithubBtn"
import GithubAvatar from "./GithubAvatar"
import { handleAuth, handleLogout, useAuthTokenExpiration } from "../../utils"
import axios from "axios"
import { backendURL } from "../../constants"
import DarkModeToggle from "./DarkModeToggle"

const pages = ["Home", "Map", "People", "About"]
const settings = ["Profile", "Login/Logout"]

export default function Navbar({ user, setUser }) {
  const [anchorElNav, setAnchorElNav] = React.useState(null)
  const [anchorElUser, setAnchorElUser] = React.useState(null)
  const navigate = useNavigate()

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget)
  }
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget)
  }

  const handleCloseNavMenu = () => {
    setAnchorElNav(null)
  }

  const handleCloseUserMenu = (page) => {
    if (page === "Login/Logout") {
      page = "login"
    }
    navigate(`/${page.toLowerCase()}`)
    setAnchorElUser(null)
  }

  const handleNavigate = (page) => {
    if (page === "Home") {
      page = ""
    }
    navigate(`/${page.toLowerCase()}`)
    handleCloseNavMenu()
  }

  // Old vars

  // const [showUserProfileModal, setShowUserProfileModal] = useState(false)

  const [anchorEl, setAnchorEl] = React.useState(null)

  const [startAuth, setStartAuth] = React.useState(false)
  const [code, setCode] = React.useState(null)
  const usedCodes = React.useRef(new Set())

  const handleLogin = React.useCallback(async (authCode) => {
    if (usedCodes.current.has(authCode)) {
      // console.log(`Auth code ${authCode} has already been used.`)
      return
    }

    try {
      const response = await axios.get(
        `${backendURL}/api/callback?code=${authCode}`
      )
      const userData = response.data
      localStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)
      // console.log("USER INFO", userData)
      usedCodes.current.add(authCode)

      setTimeout(() => {
        // window.location.href = `${frontendURL}`
        if (userData.updated) {
          navigate("/profile")
        } else {
          const confirmed = window.confirm("Please complete your profile now!")
          if (confirmed) navigate("/profile/edit")
        }
      }, 100)
    } catch (error) {
      console.error("Error logging in:", error)
    }
  }, [])

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const authCode = urlParams.get("code")
    if (authCode && !usedCodes.current.has(authCode)) {
      setCode(authCode)
      // console.log(authCode)
      handleLogin(authCode)
    }
  }, [startAuth])

  useAuthTokenExpiration(user?.refresh, setUser)
  return (
    <AppBar
      position="static"
      id="navbar"
      sx={{ height: { xs: 54, md: 64 }, display: "flex", alignItems: "center" }}
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            height: { xs: 54, md: 64 },
            display: "flex",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* <Typography
            variant="h6"
            noWrap
            component="a"
            href="#"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <a href="/">
              <img
                src="/assets/logo.png"
                alt="ALXHoF Logo"
                title="ALX Hall of Fame"
                className="w-[55px] h-[63px] mt-2"
              />
            </a>
          </Typography> */}
          <Box sx={{ display: { xs: "none", md: "flex" }, mr: 2 }}>
            <a href="/">
              <img
                src="/assets/logo.png"
                alt="ALXHoF Logo"
                title="ALX Hall of Fame"
                className="w-[55px] h-[63px] mt-2"
              />
            </a>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: "block", md: "none" },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={() => handleNavigate(page)}>
                  <Typography textAlign="center">{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              // mr: 2,
              flexGrow: 1,
              marginLeft: "55px",
            }}
          >
            <a href="/">
              <img
                src="/assets/logo.png"
                alt="ALX HoF Logo"
                title="ALX Hall of Fame"
                className="w-[48px] h-[53px] mt-1"
              />
            </a>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            {pages.map((page) => (
              <Button
                key={page}
                onClick={() => handleNavigate(page)}
                sx={{ my: 2, color: "white", display: "block" }}
              >
                {page}
              </Button>
            ))}
          </Box>

          <Box sx={{ flexGrow: 0, display: "flex", gap: 2 }}>
            <DarkModeToggle />
            <Typography sx={{ display: { xs: "none", md: "flex" } }}>
              <GithubBtn
                user={user}
                BtnFunction={
                  user.is_authenticated
                    ? () => {
                        handleLogout({ setUser })
                        navigate("/")
                      }
                    : handleAuth
                }
                setStartAuth={setStartAuth}
              />
            </Typography>

            <Tooltip title="Profile" sx={{ display: "flex" }}>
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                {user.is_authenticated ? (
                  <GithubAvatar user={user} />
                ) : (
                  <Avatar alt="Login" />
                )}
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: "45px" }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorElUser)}
              onClose={() => handleCloseUserMenu("Profile")}
            >
              {settings.map((setting) => (
                <MenuItem
                  key={setting}
                  onClick={() => handleCloseUserMenu(setting)}
                >
                  <Typography textAlign="center">{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}
