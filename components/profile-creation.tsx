"use client"

import { useState } from "react"
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Sparkles,
  User,
  UserRound,
  WandSparkles,
} from "lucide-react"
import { AvatarBubble } from "./avatar-bubble"
import { ThemeToggle } from "./theme-toggle"
import {
  ACTIVITIES,
  LOCATION_ORIGIN,
  LOCATIONS,
  TIME_SLOTS,
  formatDistance,
  getRandomColor,
} from "@/lib/constants"
import type { UserProfile } from "@/lib/types"

interface ProfileCreationProps {
  initialProfile?: UserProfile | null
  onJoinPool: (profile: UserProfile) => void
  onReturnToPool?: () => void
  onBrowsePool?: () => void
}

interface AvatarPromptInput {
  activity: string
  description: string
  gender: string
  ageRange: string
}

const AVATAR_GENDERS = [
  { label: "No gender preference", value: "" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
] as const

const AVATAR_AGE_RANGES = [
  { label: "No age preference", value: "" },
  { label: "18-24", value: "18-24" },
  { label: "25-34", value: "25-34" },
  { label: "35-44", value: "35-44" },
  { label: "45-54", value: "45-54" },
  { label: "55+", value: "55+" },
] as const

function getProfileTimeSlotIndex(profile?: UserProfile | null): number {
  if (!profile) return -1

  return TIME_SLOTS.findIndex(
    (slot) => slot.start === profile.timeStart && slot.end === profile.timeEnd
  )
}

function buildAvatarPrompt({
  activity,
  description,
  gender,
  ageRange,
}: AvatarPromptInput): string {
  const promptParts = [
    "Create a highly detailed circular avatar portrait, not a placeholder.",
    `The avatar must clearly show a person doing this activity: ${activity}.`,
    "Make the activity instantly recognizable from the image alone by including the right props, outfit, environment, and action pose.",
    "For sports or hobbies, show clear equipment such as the ball, instrument, book, camera, bike, mat, or tools needed for the selected activity.",
  ]

  if (description) {
    promptParts.push(
      `Use these extra visual details when they fit the activity: ${description}.`
    )
  }

  if (gender) {
    promptParts.push(`The character should read clearly as ${gender}.`)
  }

  if (ageRange) {
    promptParts.push(
      `The character should look like they are in the ${ageRange} age range with natural age cues.`
    )
  }

  promptParts.push(
    "Use expressive character design, detailed face, rich clothing and accessories, polished digital illustration, textured brushwork, and a vibrant but soft background.",
    "Avatar-ready crop, centered composition, no initials, no letters, no text, no watermark, not a simple smiley face, not a flat icon, not generic clipart."
  )

  return promptParts.join(" ")
}

export function ProfileCreation({
  initialProfile,
  onJoinPool,
  onReturnToPool,
  onBrowsePool,
}: ProfileCreationProps) {
  const [name, setName] = useState(initialProfile?.name ?? "")
  const [avatarDescription, setAvatarDescription] = useState(
    initialProfile?.avatarDescription ?? ""
  )
  const [avatarGender, setAvatarGender] = useState(
    initialProfile?.avatarGender ?? ""
  )
  const [avatarAgeRange, setAvatarAgeRange] = useState(
    initialProfile?.avatarAgeRange ?? ""
  )
  const [avatarBase64, setAvatarBase64] = useState(
    initialProfile?.avatarImageBase64 ?? ""
  )
  const [activity, setActivity] = useState(initialProfile?.activity ?? "")
  const [location, setLocation] = useState(initialProfile?.location ?? "")
  const [timeSlotIndex, setTimeSlotIndex] = useState(
    getProfileTimeSlotIndex(initialProfile)
  )
  const [color] = useState(() => initialProfile?.color ?? getRandomColor())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const selectedTimeSlot = timeSlotIndex >= 0 ? TIME_SLOTS[timeSlotIndex] : null

  const isSavedProfileUnchanged =
    Boolean(initialProfile && onReturnToPool) &&
    name.trim() === initialProfile?.name &&
    avatarDescription.trim() === (initialProfile?.avatarDescription ?? "") &&
    avatarGender === (initialProfile?.avatarGender ?? "") &&
    avatarAgeRange === (initialProfile?.avatarAgeRange ?? "") &&
    avatarBase64 === initialProfile?.avatarImageBase64 &&
    activity === initialProfile?.activity &&
    location === initialProfile?.location &&
    selectedTimeSlot?.start === initialProfile?.timeStart &&
    selectedTimeSlot?.end === initialProfile?.timeEnd

  const canJoin =
    name.trim() &&
    avatarBase64 &&
    activity &&
    location &&
    selectedTimeSlot

  function resetGeneratedAvatar() {
    setAvatarBase64("")
    setNotice("")
  }

  function handleAvatarDescriptionChange(value: string) {
    setAvatarDescription(value)
    resetGeneratedAvatar()
  }

  function handleAvatarGenderChange(value: string) {
    setAvatarGender(value)
    resetGeneratedAvatar()
  }

  function handleAvatarAgeRangeChange(value: string) {
    setAvatarAgeRange(value)
    resetGeneratedAvatar()
  }

  function handleActivityChange(value: string) {
    setActivity(value)
    resetGeneratedAvatar()
  }

  async function handleGenerateAvatar() {
    if (!activity) return
    setIsGenerating(true)
    setError("")
    setNotice("")

    const enhancedPrompt = buildAvatarPrompt({
      activity,
      description: avatarDescription.trim(),
      gender: avatarGender,
      ageRange: avatarAgeRange,
    })

    try {
      const resp = await fetch("/api/generate-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
        }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        throw new Error(data?.error || `Failed to generate avatar (${resp.status})`)
      }

      const data = await resp.json()
      if (!data.b64_json) {
        throw new Error("Avatar response did not include an image")
      }
      setAvatarBase64(data.b64_json)
      if (data.fallback) {
        setNotice("The image service is busy, so we made a simple avatar for now.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate avatar")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleJoinPool() {
    if (!canJoin || !selectedTimeSlot) return
    setIsJoining(true)

    const profile: UserProfile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      avatarDescription: avatarDescription.trim() || undefined,
      avatarGender: avatarGender || undefined,
      avatarAgeRange: avatarAgeRange || undefined,
      avatarImageBase64: avatarBase64,
      activity,
      location,
      timeStart: selectedTimeSlot.start,
      timeEnd: selectedTimeSlot.end,
      color,
      createdAt: Date.now(),
    }

    try {
      const resp = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })

      if (!resp.ok) throw new Error("Failed to save profile")

      onJoinPool(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join pool")
      setIsJoining(false)
    }
  }

  function handlePrimaryAction() {
    if (isSavedProfileUnchanged && onReturnToPool) {
      onReturnToPool()
      return
    }

    void handleJoinPool()
  }

  return (
    <main className="app-surface min-h-screen">
      <div className="page-frame">
        <header className="top-bar">
          <div className="brand-chip">
            <span className="brand-mark" />
            Activity Magnets
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            {onBrowsePool && (
              <button
                type="button"
                onClick={onBrowsePool}
                className="pool-forward"
              >
                Forward
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        <div className="profile-grid">
          <section className="profile-hero" aria-labelledby="activity-title">
            <p className="hero-kicker">Magnetic social discovery</p>
            <h1 id="activity-title" className="hero-title">
              Find the people already moving <span>your way.</span>
            </h1>
            <p className="hero-copy">
              A living field of avatars tuned by activity, time, and proximity.
              Create a visual signal, then drop into the pool.
            </p>

            <div className="magnet-radar" aria-hidden="true">
              <div className="radar-plane" />
              <div className="radar-path" />
              <span className="radar-node" />
              <span className="radar-node" />
              <span className="radar-node" />
            </div>

            <div className="signal-row" aria-label="Match signals">
              <div className="signal-card">
                <strong>Intent</strong>
                <span>{activity || "Choose activity"}</span>
              </div>
              <div className="signal-card">
                <strong>Place</strong>
                <span>{location || "Choose location"}</span>
              </div>
              <div className="signal-card">
                <strong>Window</strong>
                <span>{selectedTimeSlot?.label || "Choose time"}</span>
              </div>
            </div>
          </section>

          <section className="glass-panel profile-panel" aria-label="Create profile">
            <div className="panel-heading">
              <div>
                <h2>Signal Builder</h2>
                <span>One profile for the current pool.</span>
              </div>
              <WandSparkles className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>

            <div className="form-stack">
              <div className="field-group">
                <label className="field-label">
                  <User />
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="field-control"
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  <Activity />
                  Activity
                </label>
                <select
                  value={activity}
                  onChange={(e) => handleActivityChange(e.target.value)}
                  className="field-control"
                >
                  <option value="">Choose activity</option>
                  {ACTIVITIES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">
                  <Sparkles />
                  Avatar direction
                </label>
                <div className="avatar-options-grid">
                  <div className="field-group">
                    <label className="field-label field-label--compact">
                      <UserRound />
                      Gender (optional)
                    </label>
                    <select
                      value={avatarGender}
                      onChange={(e) => handleAvatarGenderChange(e.target.value)}
                      className="field-control"
                    >
                      {AVATAR_GENDERS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label field-label--compact">
                      <CalendarDays />
                      Age range (optional)
                    </label>
                    <select
                      value={avatarAgeRange}
                      onChange={(e) => handleAvatarAgeRangeChange(e.target.value)}
                      className="field-control"
                    >
                      {AVATAR_AGE_RANGES.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea
                  value={avatarDescription}
                  onChange={(e) => handleAvatarDescriptionChange(e.target.value)}
                  placeholder="Optional details: outfit, mood, setting, or pose."
                  rows={3}
                  className="field-control"
                />

                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  disabled={!activity || isGenerating}
                  className="button-secondary"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating avatar
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate avatar
                    </>
                  )}
                </button>
              </div>

              {avatarBase64 && (
                <div className="avatar-stage">
                  <AvatarBubble
                    description={avatarDescription.trim() || `${activity} avatar`}
                    name={name || "You"}
                    imageBase64={avatarBase64}
                    activity={activity || "..."}
                    color={color}
                    size="xl"
                  />
                </div>
              )}

              <div className="field-group">
                <label className="field-label">
                  <MapPin />
                  Location from {LOCATION_ORIGIN}
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="field-control"
                >
                  <option value="">Choose location</option>
                  {LOCATIONS.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.name} ({formatDistance(l.distance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">
                  <Clock />
                  Time window
                </label>
                <select
                  value={timeSlotIndex}
                  onChange={(e) => setTimeSlotIndex(Number(e.target.value))}
                  className="field-control"
                >
                  <option value={-1}>Choose time window</option>
                  {TIME_SLOTS.map((t, i) => (
                    <option key={t.label} value={i}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && <div className="status-error">{error}</div>}
              {notice && <div className="status-notice">{notice}</div>}

              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={(!isSavedProfileUnchanged && !canJoin) || isJoining}
                className="button-primary"
              >
                {isSavedProfileUnchanged ? (
                  "Return to Magnet Pool"
                ) : isJoining ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Joining
                  </>
                ) : (
                  "Join the Magnet Pool"
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
