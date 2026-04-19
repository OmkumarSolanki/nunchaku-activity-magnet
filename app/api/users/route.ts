import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { Redis } from "@upstash/redis"
import type { UserProfile } from "@/lib/types"

const DATA_FILE = join(process.cwd(), "data", "users.json")
const USERS_REDIS_KEY = "activity-magnets:users"
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
}
const memoryUsers: UserProfile[] = []

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

  if (!url || !token) return null

  return new Redis({ url, token })
}

function readUsers(): UserProfile[] {
  if (process.env.VERCEL) {
    return memoryUsers
  }

  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, "[]", "utf-8")
    return []
  }
  const raw = readFileSync(DATA_FILE, "utf-8")
  return JSON.parse(raw)
}

function writeUsers(users: UserProfile[]) {
  if (process.env.VERCEL) {
    memoryUsers.splice(0, memoryUsers.length, ...users)
    return
  }

  writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8")
}

async function readStoredUsers(): Promise<UserProfile[]> {
  const redis = getRedis()

  if (redis) {
    return (await redis.get<UserProfile[]>(USERS_REDIS_KEY)) ?? []
  }

  return readUsers()
}

async function writeStoredUsers(users: UserProfile[]) {
  const redis = getRedis()

  if (redis) {
    await redis.set(USERS_REDIS_KEY, users)
    return
  }

  writeUsers(users)
}

export async function GET() {
  const users = await readStoredUsers()
  return Response.json(users, { headers: NO_STORE_HEADERS })
}

export async function POST(request: Request) {
  const user: UserProfile = await request.json()

  if (!user.id || !user.name) {
    return Response.json({ error: "id and name are required" }, { status: 400 })
  }

  const users = await readStoredUsers()
  const existingIndex = users.findIndex((existing) => existing.id === user.id)

  if (existingIndex >= 0) {
    users[existingIndex] = user
  } else {
    users.push(user)
  }

  await writeStoredUsers(users)

  return Response.json(user, { status: 201, headers: NO_STORE_HEADERS })
}
