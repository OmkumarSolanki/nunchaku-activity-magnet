export const ACTIVITIES = [
  "Running",
  "Coffee Chat",
  "Co-working",
  "Yoga",
  "Photography",
  "Reading",
  "Cycling",
  "Sketching",
  "Dog Walking",
  "Gaming",
  "Music Jam",
  "Language Exchange",
] as const

export const LOCATIONS = [
  { name: "Charles River Esplanade", shortName: "Esplanade", distance: 0.5 },
  { name: "Back Bay", shortName: "Back Bay", distance: 1 },
  { name: "Fenway Park", shortName: "Fenway", distance: 1.5 },
  { name: "Museum of Fine Arts", shortName: "MFA", distance: 2 },
  { name: "Boston Common", shortName: "Common", distance: 2.5 },
  { name: "Faneuil Hall", shortName: "Faneuil", distance: 3 },
  { name: "North End", shortName: "North End", distance: 3.5 },
  { name: "Seaport District", shortName: "Seaport", distance: 4 },
  { name: "USS Constitution", shortName: "USS Const.", distance: 4.5 },
  { name: "Jamaica Pond", shortName: "Jamaica", distance: 5 },
  { name: "Carson Beach", shortName: "Carson", distance: 5.5 },
  { name: "Arnold Arboretum", shortName: "Arboretum", distance: 6 },
  { name: "Franklin Park", shortName: "Franklin", distance: 6.5 },
  { name: "Castle Island", shortName: "Castle", distance: 7 },
] as const

export const LOCATION_ORIGIN = "MIT"
export const DISTANCE_UNIT = "mi"
export const MAX_DISTANCE = 7

export const TIME_SLOTS = [
  { label: "Early Morning (6-9 AM)", start: 6, end: 9 },
  { label: "Morning (9-12 PM)", start: 9, end: 12 },
  { label: "Afternoon (12-3 PM)", start: 12, end: 15 },
  { label: "Late Afternoon (3-6 PM)", start: 15, end: 18 },
  { label: "Evening (6-9 PM)", start: 18, end: 21 },
  { label: "Night (9-12 AM)", start: 21, end: 24 },
] as const

export const COLORS = [
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
] as const

export function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

const LEGACY_LOCATION_DISTANCES: Record<string, number> = {
  Downtown: 0.5,
  "Park District": 2,
  "Arts District": 3,
  "University Area": 4,
  Waterfront: 5,
  "Shopping Center": 6,
  "Residential North": 6.5,
  "Residential South": 7,
}

export function formatDistance(distance: number): string {
  return `${Number.isInteger(distance) ? distance : distance.toFixed(1)} ${DISTANCE_UNIT}`
}

export function getLocationDistance(locationName: string): number {
  const loc = LOCATIONS.find((l) => l.name === locationName)
  return loc ? loc.distance : LEGACY_LOCATION_DISTANCES[locationName] ?? 0.5
}
