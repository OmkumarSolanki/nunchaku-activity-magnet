"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { AvatarBubble } from "./avatar-bubble"
import { ThemeToggle } from "./theme-toggle"
import {
  LOCATION_ORIGIN,
  LOCATIONS,
  MAX_DISTANCE,
  TIME_SLOTS,
  formatDistance,
  getLocationDistance,
} from "@/lib/constants"
import type { UserProfile } from "@/lib/types"
import { ArrowLeft, X } from "lucide-react"

interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  profile: UserProfile
  targetX: number
  targetY: number
  clusterCount: number
}

interface MagnetPoolProps {
  userProfile: UserProfile
  onBack: () => void
}

const PADDING_LEFT = 80
const PADDING_RIGHT = 40
const PADDING_TOP = 60
const PADDING_BOTTOM = 148
const CLUSTER_RADIUS = 54
const MIN_DISTANCE_STEP_WIDTH = 112
const USER_REFRESH_INTERVAL_MS = 2_000

function getMinimumCanvasWidth() {
  return (
    PADDING_LEFT +
    PADDING_RIGHT +
    Math.ceil(MAX_DISTANCE / 0.5) * MIN_DISTANCE_STEP_WIDTH
  )
}

function formatTime(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function formatGender(value?: string): string {
  if (!value) return "Not specified"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatAgeRange(value?: string): string {
  return value || "Not specified"
}

function clamp(value: number, min: number, max: number): number {
  const safeMax = Math.max(min, max)
  return Math.min(Math.max(value, min), safeMax)
}

function getTargetGroupKey(profile: UserProfile): string {
  return `${profile.location}|${profile.timeStart}-${profile.timeEnd}`
}

function getProfileSignature(profile: UserProfile): string {
  return [
    profile.id,
    profile.name,
    profile.activity,
    profile.location,
    profile.timeStart,
    profile.timeEnd,
    profile.avatarDescription ?? "",
    profile.avatarGender ?? "",
    profile.avatarAgeRange ?? "",
    profile.avatarImageBase64.length,
    profile.createdAt,
  ].join(":")
}

function getClusterOffset(index: number, count: number) {
  if (count <= 1) return { x: 0, y: 0 }

  const ring = Math.floor(index / 8)
  const itemsInRing = Math.min(8, count - ring * 8)
  const ringIndex = index % 8
  const angle = -Math.PI / 2 + (ringIndex / itemsInRing) * Math.PI * 2
  const radius = CLUSTER_RADIUS + ring * 38

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}

export function MagnetPool({ userProfile, onBack }: MagnetPoolProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const [particles, setParticles] = useState<Particle[]>([])
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [hoveredUser, setHoveredUser] = useState<UserProfile | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const prevUsersSignatureRef = useRef("")

  const calculateSimilarity = useCallback(
    (p1: UserProfile, p2: UserProfile): number => {
      let score = 0
      if (p1.activity === p2.activity) score += 0.5
      const timeOverlap = Math.max(
        0,
        Math.min(p1.timeEnd, p2.timeEnd) - Math.max(p1.timeStart, p2.timeStart)
      )
      score += (timeOverlap / 6) * 0.3
      const d1 = getLocationDistance(p1.location)
      const d2 = getLocationDistance(p2.location)
      const locDist = Math.abs(d1 - d2)
      score += ((MAX_DISTANCE - locDist) / MAX_DISTANCE) * 0.2
      return score
    },
    []
  )

  const calcBaseTarget = useCallback((
    profile: UserProfile,
    width: number,
    height: number
  ): { targetX: number; targetY: number } => {
    const dist = getLocationDistance(profile.location)
    const timeCenter = (profile.timeStart + profile.timeEnd) / 2
    const targetX =
      PADDING_LEFT +
      (dist / MAX_DISTANCE) * (width - PADDING_LEFT - PADDING_RIGHT)
    const targetY =
      PADDING_TOP +
      ((timeCenter - 6) / 18) * (height - PADDING_TOP - PADDING_BOTTOM)
    return { targetX, targetY }
  }, [])

  const calcClusterTargets = useCallback((
    profiles: UserProfile[],
    width: number,
    height: number
  ) => {
    const groups = new Map<string, UserProfile[]>()

    for (const profile of profiles) {
      const key = getTargetGroupKey(profile)
      const group = groups.get(key) ?? []
      group.push(profile)
      groups.set(key, group)
    }

    const targets = new Map<
      string,
      { targetX: number; targetY: number; clusterCount: number }
    >()

    for (const group of groups.values()) {
      const sortedGroup = [...group].sort(
        (a, b) =>
          a.createdAt - b.createdAt ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id)
      )

      sortedGroup.forEach((profile, index) => {
        const base = calcBaseTarget(profile, width, height)
        const offset = getClusterOffset(index, sortedGroup.length)
        targets.set(profile.id, {
          targetX: clamp(
            base.targetX + offset.x,
            PADDING_LEFT,
            width - PADDING_RIGHT
          ),
          targetY: clamp(
            base.targetY + offset.y,
            PADDING_TOP,
            height - PADDING_BOTTOM
          ),
          clusterCount: sortedGroup.length,
        })
      })
    }

    return targets
  }, [calcBaseTarget])

  // Track container size
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const nextDimensions = {
          width: Math.max(
            containerRef.current.offsetWidth,
            getMinimumCanvasWidth()
          ),
          height: containerRef.current.offsetHeight,
        }

        setDimensions(nextDimensions)
        setParticles((prev) =>
          {
            const targets = calcClusterTargets(
              prev.map((p) => p.profile),
              nextDimensions.width,
              nextDimensions.height
            )
            return prev.map((p) => {
              const target = targets.get(p.id)
              return target ? { ...p, ...target } : p
            })
          }
        )
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [calcClusterTargets])

  // Poll for users so already-open pools pick up people who join later.
  useEffect(() => {
    let active = true

    async function fetchUsers() {
      try {
        const resp = await fetch("/api/users", { cache: "no-store" })
        if (!resp.ok) return
        const users: UserProfile[] = await resp.json()

        // Merge: current user + all other users from server (dedup by id)
        const allIds = new Set<string>()
        const allProfiles: UserProfile[] = []

        // Always include current user first
        allIds.add(userProfile.id)
        allProfiles.push(userProfile)

        for (const u of users) {
          if (!allIds.has(u.id)) {
            allIds.add(u.id)
            allProfiles.push(u)
          }
        }

        if (!active) return

        const nextSignature = allProfiles
          .map(getProfileSignature)
          .sort()
          .join("|")

        if (prevUsersSignatureRef.current !== nextSignature) {
          prevUsersSignatureRef.current = nextSignature

          setParticles((prev) => {
            const existingMap = new Map(prev.map((p) => [p.id, p]))
            const targets = calcClusterTargets(
              allProfiles,
              dimensions.width,
              dimensions.height
            )
            return allProfiles.map((profile) => {
              const existing = existingMap.get(profile.id)
              const target = targets.get(profile.id) ?? {
                ...calcBaseTarget(profile, dimensions.width, dimensions.height),
                clusterCount: 1,
              }

              if (existing) {
                return { ...existing, profile, ...target }
              }

              // New particle: start at random position
              return {
                id: profile.id,
                x:
                  PADDING_LEFT +
                  Math.random() *
                    (dimensions.width - PADDING_LEFT - PADDING_RIGHT),
                y:
                  PADDING_TOP +
                  Math.random() *
                    (dimensions.height - PADDING_TOP - PADDING_BOTTOM),
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                profile,
                ...target,
              }
            })
          })
        }
      } catch {
        // Silently ignore fetch errors
      }
    }

    fetchUsers()
    const interval = setInterval(fetchUsers, USER_REFRESH_INTERVAL_MS)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchUsers()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [userProfile, dimensions, calcBaseTarget, calcClusterTargets])

  // Physics animation loop
  useEffect(() => {
    if (particles.length === 0) return

    const animate = () => {
      setParticles((prev) =>
        prev.map((particle) => {
          let ax = 0
          let ay = 0

          // Attraction to target
          const dx = particle.targetX - particle.x
          const dy = particle.targetY - particle.y
          ax += dx * 0.003
          ay += dy * 0.003

          // Inter-particle forces
          for (const other of prev) {
            if (other.id === particle.id) continue

            const diffX = other.x - particle.x
            const diffY = other.y - particle.y
            const dist = Math.sqrt(diffX * diffX + diffY * diffY)
            if (dist < 1) continue

            const minDist = 90

            if (dist < minDist) {
              const repelForce = ((minDist - dist) / minDist) * 0.4
              ax -= (diffX / dist) * repelForce
              ay -= (diffY / dist) * repelForce
            } else {
              const similarity = calculateSimilarity(
                particle.profile,
                other.profile
              )
              if (similarity > 0.3 && dist < 250) {
                const attractForce = similarity * 0.015
                ax += (diffX / dist) * attractForce
                ay += (diffY / dist) * attractForce
              }
            }
          }

          let vx = (particle.vx + ax) * 0.94
          let vy = (particle.vy + ay) * 0.94

          vx += (Math.random() - 0.5) * 0.06
          vy += (Math.random() - 0.5) * 0.06

          const maxVel = 2.5
          const vel = Math.sqrt(vx * vx + vy * vy)
          if (vel > maxVel) {
            vx = (vx / vel) * maxVel
            vy = (vy / vel) * maxVel
          }

          let x = particle.x + vx
          let y = particle.y + vy

          if (x < PADDING_LEFT) {
            x = PADDING_LEFT
            vx *= -0.5
          }
          if (x > dimensions.width - PADDING_RIGHT) {
            x = dimensions.width - PADDING_RIGHT
            vx *= -0.5
          }
          if (y < PADDING_TOP) {
            y = PADDING_TOP
            vy *= -0.5
          }
          if (y > dimensions.height - PADDING_BOTTOM) {
            y = dimensions.height - PADDING_BOTTOM
            vy *= -0.5
          }

          return { ...particle, x, y, vx, vy }
        })
      )

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [particles.length, dimensions, calculateSimilarity])

  const hoveredParticle = hoveredUser
    ? particles.find((particle) => particle.id === hoveredUser.id)
    : null
  const hoverCardPosition = hoveredParticle
    ? {
        left: clamp(hoveredParticle.x + 48, 14, dimensions.width - 256),
        top: clamp(hoveredParticle.y - 28, 14, dimensions.height - 220),
      }
    : null
  const hoverDetails = hoveredUser
    ? [
        { label: "Activity", value: hoveredUser.activity },
        { label: "Gender", value: formatGender(hoveredUser.avatarGender) },
        {
          label: "Time",
          value: `${formatTime(hoveredUser.timeStart)} - ${formatTime(
            hoveredUser.timeEnd
          )}`,
        },
        { label: "Age", value: formatAgeRange(hoveredUser.avatarAgeRange) },
      ]
    : []

  return (
    <main className="app-surface pool-shell flex flex-col">
      <header className="pool-header">
        <button type="button" onClick={onBack} className="pool-back">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="pool-chip">
          <span className="brand-mark" />
          Magnet Pool
        </div>
        <div className="pool-actions">
          <ThemeToggle />
        </div>
      </header>

      <div className="pool-stage flex-1" ref={containerRef}>
        <div className="time-axis-label absolute z-30">
          <span className="axis-label">Time</span>
        </div>

        <div className="distance-axis-label absolute z-30">
          <span className="axis-label">Distance from {LOCATION_ORIGIN}</span>
        </div>

        {TIME_SLOTS.map((slot) => {
          const center = (slot.start + slot.end) / 2
          const yPct =
            ((center - 6) / 18) *
            (dimensions.height - PADDING_TOP - PADDING_BOTTOM)
          return (
            <div
              key={slot.label}
              className="axis-tick absolute z-30"
              style={{
                left: 10,
                top: PADDING_TOP + yPct,
                transform: "translateY(-50%)",
              }}
            >
              {formatTime(slot.start)}
            </div>
          )
        })}

        <div className="pool-scroll">
          <div
            className="pool-canvas"
            style={{
              height: dimensions.height,
              width: dimensions.width,
            }}
          >
            {LOCATIONS.map((loc) => {
              const xPct =
                (loc.distance / MAX_DISTANCE) *
                (dimensions.width - PADDING_LEFT - PADDING_RIGHT)
              const x = PADDING_LEFT + xPct
              const labelX = Math.min(
                Math.max(x, 112),
                Math.max(112, dimensions.width - 132)
              )
              return (
                <div
                  key={loc.name}
                  className="location-tick absolute z-10 whitespace-nowrap"
                  style={{
                    left: labelX,
                    bottom: 58,
                    transform: "translateX(-50%) rotate(-30deg)",
                    transformOrigin: "top center",
                  }}
                >
                  {loc.shortName}
                  <span className="ml-1">{formatDistance(loc.distance)}</span>
                </div>
              )
            })}

            <svg className="absolute inset-0 h-full w-full pointer-events-none">
              {TIME_SLOTS.map((slot) => {
                const center = (slot.start + slot.end) / 2
                const y =
                  PADDING_TOP +
                  ((center - 6) / 18) *
                    (dimensions.height - PADDING_TOP - PADDING_BOTTOM)
                return (
                  <line
                    key={`h-${slot.start}`}
                    x1={PADDING_LEFT}
                    y1={y}
                    x2={dimensions.width - PADDING_RIGHT}
                    y2={y}
                    stroke="var(--grid-strong)"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                    opacity="0.78"
                  />
                )
              })}
              {LOCATIONS.map((loc) => {
                const x =
                  PADDING_LEFT +
                  (loc.distance / MAX_DISTANCE) *
                    (dimensions.width - PADDING_LEFT - PADDING_RIGHT)
                return (
                  <line
                    key={`v-${loc.name}`}
                    x1={x}
                    y1={PADDING_TOP}
                    x2={x}
                    y2={dimensions.height - PADDING_BOTTOM}
                    stroke="var(--grid-strong)"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                    opacity="0.78"
                  />
                )
              })}
            </svg>

            {particles.map((particle) => {
              const isUser = particle.id === userProfile.id
              const isHovered = hoveredUser?.id === particle.id
              const similarity = calculateSimilarity(userProfile, particle.profile)
              const zIndex = isHovered
                ? 400
                : selectedUser?.id === particle.id
                  ? 140
                  : isUser
                    ? 120
                    : hoveredUser
                      ? 0
                      : 1

              return (
                <div
                  key={particle.id}
                  className={`particle-node absolute ${
                    isHovered ? "particle-node--hovered" : ""
                  } ${hoveredUser && !isHovered ? "particle-node--muted" : ""}`}
                  onBlur={() => setHoveredUser(null)}
                  onFocus={() => setHoveredUser(particle.profile)}
                  onMouseEnter={() => setHoveredUser(particle.profile)}
                  onMouseLeave={() => setHoveredUser(null)}
                  tabIndex={0}
                  style={{
                    left: particle.x,
                    top: particle.y,
                    transform: "translate(-50%, -50%)",
                    zIndex,
                  }}
                >
                  <AvatarBubble
                    description={particle.profile.avatarDescription}
                    name={particle.profile.name}
                    imageBase64={particle.profile.avatarImageBase64}
                    activity={particle.profile.activity}
                    color={particle.profile.color}
                    size="sm"
                    isHighlighted={isUser}
                    showActivityBadge={false}
                    onClick={() => setSelectedUser(particle.profile)}
                  />
                  {!isUser && similarity > 0.3 && (
                    <div
                      className="similarity-dot"
                      style={{ opacity: 0.5 + similarity * 0.5 }}
                    />
                  )}
                  {particle.clusterCount > 1 && (
                    <div className="cluster-count" title="Same location and time">
                      {particle.clusterCount}
                    </div>
                  )}
                </div>
              )
            })}

            {hoveredUser && hoverCardPosition && (
              <div
                className="hover-card"
                style={{
                  ...hoverCardPosition,
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  pointerEvents: "none",
                  position: "absolute",
                  width: 242,
                  zIndex: 420,
                }}
              >
                {hoverDetails.map((detail) => (
                  <div
                    key={detail.label}
                    className="hover-card__row"
                    style={{
                      alignItems: "center",
                      columnGap: 16,
                      display: "grid",
                      gridTemplateColumns: "68px minmax(0, 1fr)",
                      minHeight: 40,
                      padding: "9px 11px",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {detail.label}
                    </span>
                    <strong
                      style={{
                        display: "block",
                        minWidth: 0,
                        overflow: "hidden",
                        textAlign: "right",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {detail.value}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="legend-panel">
        <p>Legend</p>
        <div className="legend-item">
          <span className="legend-dot legend-dot--you" />
          <span>You</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" />
          <span>Match</span>
        </div>
      </div>

      {selectedUser && (
        <div className="selected-panel">
          <div className="selected-panel__inner">
            <AvatarBubble
              description={selectedUser.avatarDescription}
              name={selectedUser.name}
              imageBase64={selectedUser.avatarImageBase64}
              activity={selectedUser.activity}
              color={selectedUser.color}
              size="md"
              showActivityBadge={false}
            />
            <div className="min-w-0 flex-1">
              <h3>{selectedUser.name}</h3>
              <p>
                {selectedUser.activity} &middot; {selectedUser.location}
              </p>
              <p>
                Available: {formatTime(selectedUser.timeStart)} -{" "}
                {formatTime(selectedUser.timeEnd)}
              </p>
              {selectedUser.id !== userProfile.id && (
                <div className="match-badge">
                  <span className="legend-dot" />
                  {Math.round(calculateSimilarity(userProfile, selectedUser) * 100)}
                  % match
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="panel-close"
              aria-label="Close selected profile"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
