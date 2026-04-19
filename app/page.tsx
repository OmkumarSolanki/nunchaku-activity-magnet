"use client"

import { useEffect, useState } from "react"
import { ProfileCreation } from "@/components/profile-creation"
import { MagnetPool } from "@/components/magnet-pool"
import type { UserProfile } from "@/lib/types"

const CURRENT_PROFILE_STORAGE_KEY = "activity-magnets-current-profile"

function getStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null

  try {
    const raw = localStorage.getItem(CURRENT_PROFILE_STORAGE_KEY)
    if (!raw) return null
    const profile = JSON.parse(raw) as Partial<UserProfile>

    if (
      typeof profile.id !== "string" ||
      typeof profile.name !== "string" ||
      typeof profile.avatarImageBase64 !== "string"
    ) {
      return null
    }

    return profile as UserProfile
  } catch {
    return null
  }
}

function storeProfile(profile: UserProfile) {
  try {
    localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Ignore storage failures; the in-memory profile still works for this session.
  }
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<"profile" | "pool">("profile")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    getStoredProfile
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedProfile = getStoredProfile()
      if (storedProfile) {
        setUserProfile(storedProfile)
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  function handleJoinPool(profile: UserProfile) {
    setUserProfile(profile)
    storeProfile(profile)
    setCurrentPage("pool")
  }

  function handleBack() {
    setCurrentPage("profile")
  }

  if (currentPage === "pool" && userProfile) {
    return <MagnetPool userProfile={userProfile} onBack={handleBack} />
  }

  return (
    <ProfileCreation
      key={userProfile?.id ?? "new-profile"}
      initialProfile={userProfile}
      onJoinPool={handleJoinPool}
      onReturnToPool={userProfile ? () => setCurrentPage("pool") : undefined}
    />
  )
}
