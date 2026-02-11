"use client"

import { usePathname } from "next/navigation"
import { Moon, Sun, LogOut, User } from "lucide-react"
import { useTheme } from "next-themes"
import { signout } from "@/app/auth/actions"
import type { UserProfile } from "@/lib/types"
import { useState, useRef, useEffect } from "react"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/devices": "Devices",
  "/dashboard/services": "Service Records",
  "/dashboard/categories": "Categories",
  "/dashboard/pricing": "Pricing",
  "/dashboard/documents": "Documents",
  "/dashboard/users": "User Management",
  "/dashboard/settings": "Settings",
}

export function DashboardHeader({ user }: { user: UserProfile }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) =>
      pathname.startsWith(key) && key !== "/dashboard"
    )?.[1] ??
    "Dashboard"

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden font-medium sm:inline-block">
              {user.fullName}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
              <div className="px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-popover-foreground">
                  {user.fullName}
                </p>
                <p className="mt-0.5">{user.email}</p>
                <p className="mt-0.5 capitalize">{user.role}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setMenuOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <form action={signout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
