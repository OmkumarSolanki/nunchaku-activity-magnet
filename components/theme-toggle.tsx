"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

type ThemeMode = "light" | "dark"

const STORAGE_KEY = "activity-magnets-theme"

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light"

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "dark" || stored === "light") return stored

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }

  const isDark = theme === "dark"

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      suppressHydrationWarning
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <Sun className="theme-toggle__icon theme-toggle__icon--sun" />
        <Moon className="theme-toggle__icon theme-toggle__icon--moon" />
        <span className="theme-toggle__thumb" />
      </span>
      <span className="theme-toggle__label" suppressHydrationWarning>
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  )
}
