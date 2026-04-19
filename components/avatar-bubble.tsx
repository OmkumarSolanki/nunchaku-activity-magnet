"use client"

import Image from "next/image"

interface AvatarBubbleProps {
  description?: string
  name?: string
  imageBase64?: string
  activity: string
  color: string
  size?: "sm" | "md" | "lg" | "xl"
  isHighlighted?: boolean
  showActivityBadge?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

const SIZE_MAP = {
  sm: { container: "w-14 h-14", text: "text-[10px]", badge: "text-[8px] px-1.5 py-0.5" },
  md: { container: "w-20 h-20", text: "text-xs", badge: "text-[9px] px-2 py-0.5" },
  lg: { container: "w-28 h-28", text: "text-sm", badge: "text-[10px] px-2 py-1" },
  xl: { container: "w-44 h-44", text: "text-base", badge: "text-xs px-3 py-1" },
}

function getInitials(description: string): string {
  return description
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("")
}

function getImageSrc(imageBase64: string) {
  return imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`
}

export function AvatarBubble({
  description,
  name,
  imageBase64,
  activity,
  color,
  size = "md",
  isHighlighted = false,
  showActivityBadge = true,
  onClick,
  style,
}: AvatarBubbleProps) {
  const sizes = SIZE_MAP[size]
  const imageAlt = description?.trim() || `${activity} avatar`

  return (
    <div
      className="avatar-bubble"
      data-size={size}
      onClick={onClick}
      style={style}
    >
      <div
        className={`${sizes.container} avatar-frame ${
          isHighlighted ? "avatar-frame--highlight" : ""
        }`}
      >
        {imageBase64 ? (
          <Image
            src={getImageSrc(imageBase64)}
            alt={imageAlt}
            fill
            sizes={
              size === "sm"
                ? "56px"
                : size === "md"
                  ? "80px"
                  : size === "lg"
                    ? "112px"
                    : "176px"
            }
            className="object-cover"
            draggable={false}
            unoptimized
          />
        ) : (
          <div
            className={`avatar-fallback bg-gradient-to-br ${color}`}
          >
            <span
              className="avatar-initials"
              style={{
                fontSize:
                  size === "sm" ? 14 : size === "md" ? 18 : size === "lg" ? 24 : 34,
              }}
            >
              {getInitials(description || name || activity)}
            </span>
          </div>
        )}
      </div>

      {name && (
        <span className={`${sizes.text} avatar-name`}>
          {name}
        </span>
      )}

      {showActivityBadge && (
        <span
          className={`${sizes.badge} avatar-badge`}
        >
          {activity}
        </span>
      )}
    </div>
  )
}
