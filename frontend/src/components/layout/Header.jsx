import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import * as Menu from "@radix-ui/react-dropdown-menu"
import { LayoutDashboard, LogIn, LogOut, Menu as MenuIcon, Plus, Settings, User } from "lucide-react"
import config from "../../config"
import { useAuth } from "../../lib/auth"
import { portfolioPath } from "../../lib/content"
import Avatar from "../ui/Avatar"
import Button from "../ui/Button"
import Dialog from "../ui/Dialog"
import { LanguageSwitcher, ThemeToggle } from "./Switchers"

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight">
      <span
        aria-hidden
        className="inline-flex size-7 items-center justify-center rounded-[8px] bg-accent font-mono text-sm text-on-accent"
      >
        {config.brandName.charAt(0).toUpperCase()}
      </span>
      {config.brandName}
    </Link>
  )
}

const navItems = [
  { to: "/", key: "nav.explore", end: true },
  { to: "/people", key: "nav.people" },
  { to: "/map", key: "nav.map" },
  { to: "/about", key: "nav.about" },
]

const navClass = ({ isActive }) =>
  `inline-flex min-h-10 items-center rounded-full px-3.5 text-[15px] font-medium transition ${
    isActive ? "bg-accent-soft text-accent" : "text-text hover:bg-chip"
  }`

function AccountMenu({ user, logout }) {
  const { t } = useTranslation()
  const item =
    "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-control px-3 text-sm outline-none data-[highlighted]:bg-chip"
  return (
    <Menu.Root>
      <Menu.Trigger aria-label={t("nav.account")} className="rounded-full">
        <Avatar src={user.avatar} name={user.full_name || user.username} size="sm" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-card border border-border bg-surface p-1.5 shadow-xl"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">{user.full_name || user.username}</p>
            <p className="text-xs text-muted">@{user.username}</p>
          </div>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item asChild>
            <Link to={portfolioPath(user)} className={item}>
              <User className="size-4" aria-hidden />
              {t("nav.myPortfolio")}
            </Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link to="/dashboard" className={item}>
              <LayoutDashboard className="size-4" aria-hidden />
              {t("nav.dashboard")}
            </Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link to="/settings/profile" className={item}>
              <Settings className="size-4" aria-hidden />
              {t("nav.settings")}
            </Link>
          </Menu.Item>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item className={item} onSelect={logout}>
            <LogOut className="size-4" aria-hidden />
            {t("nav.logout")}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

export default function Header() {
  const { t } = useTranslation()
  const { user, login, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="container-page flex min-h-16 items-center gap-4">
        <Logo />
        <nav aria-label={t("nav.main")} className="ml-2 hidden flex-1 gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {user ? (
            <>
              <Button to="/dashboard?new=1" size="sm" icon={Plus} className="hidden sm:inline-flex">
                {t("nav.addProject")}
              </Button>
              <AccountMenu user={user} logout={logout} />
            </>
          ) : (
            <Button onClick={login} size="sm" variant="secondary" icon={LogIn}>
              {t("nav.login")}
            </Button>
          )}
          <button
            type="button"
            aria-label={t("nav.menu")}
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-full text-text hover:bg-chip md:hidden"
          >
            <MenuIcon className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen} title={config.brandName}>
        <nav aria-label={t("nav.main")} className="flex flex-col gap-1" onClick={() => setMobileOpen(false)}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {t(item.key)}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/dashboard?new=1" className={navClass}>
              {t("nav.addProject")}
            </NavLink>
          )}
        </nav>
        <div className="mt-6 flex items-center gap-2 border-t border-border pt-5">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </Dialog>
    </header>
  )
}
