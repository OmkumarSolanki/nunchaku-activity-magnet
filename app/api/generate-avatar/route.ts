interface GenerateAvatarRequest {
  prompt?: unknown
}

interface NunchakuImageResponse {
  data?: Array<{
    b64_json?: string
  }>
  error?: unknown
}

type AvatarAttemptResult =
  | {
      ok: true
      imageBase64: string
    }
  | {
      ok: false
      message: string
      retryable: boolean
      status?: number
      details?: unknown
    }

const NUNCHAKU_IMAGE_URL = "https://api.nunchaku.dev/v1/images/generations"
const QWEN_IMAGE_MODEL = "nunchaku-qwen-image"
const FLUX_IMAGE_MODEL = "nunchaku-flux.2-klein-9b"
const NUNCHAKU_MODEL =
  process.env.NUNCHAKU_IMAGE_MODEL ?? FLUX_IMAGE_MODEL
const AVATAR_GENERATION_ATTEMPTS = 2
const AVATAR_REQUEST_TIMEOUT_MS = 45_000
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 524])

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number) {
  return RETRYABLE_STATUSES.has(status)
}

function getImageTier(model: string) {
  if (model === FLUX_IMAGE_MODEL) {
    return "fast"
  }

  if (process.env.NUNCHAKU_IMAGE_TIER) {
    return process.env.NUNCHAKU_IMAGE_TIER
  }

  if (model === QWEN_IMAGE_MODEL && process.env.NODE_ENV !== "production") {
    return "radically_fast"
  }

  return "fast"
}

function getImageRequestBody(prompt: string) {
  const model = NUNCHAKU_MODEL
  const tier = getImageTier(model)
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size: "512x512",
    tier,
    response_format: "b64_json",
    negative_prompt:
      "simple smiley face, initials, letters, text, logo, watermark, flat icon, placeholder avatar, generic clipart",
  }

  if (model === QWEN_IMAGE_MODEL) {
    body.num_inference_steps = tier === "radically_fast" ? 4 : 28
  }

  return body
}

function getClientFailure(failure: Extract<AvatarAttemptResult, { ok: false }>) {
  if (failure.status === 429) {
    return {
      status: 429,
      error:
        "Avatar generation is busy right now. Wait a moment and try again.",
    }
  }

  if (failure.status === 524 || failure.status === 504) {
    return {
      status: 504,
      error:
        "Avatar generation timed out. Try again in a moment, or use a shorter description.",
    }
  }

  if (failure.retryable) {
    return {
      status: 502,
      error:
        "Avatar generation is temporarily unavailable. Please try again.",
    }
  }

  return {
    status: failure.status ?? 502,
    error: failure.message,
  }
}

async function requestAvatar(
  apiKey: string,
  prompt: string
): Promise<AvatarAttemptResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AVATAR_REQUEST_TIMEOUT_MS)

  let resp: Response

  try {
    resp = await fetch(NUNCHAKU_IMAGE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getImageRequestBody(prompt)),
    })
  } catch (err) {
    const timedOut = controller.signal.aborted

    return {
      ok: false,
      retryable: true,
      message: timedOut
        ? "Avatar generation timed out"
        : err instanceof Error
          ? `Avatar service request failed: ${err.message}`
          : "Avatar service request failed",
    }
  } finally {
    clearTimeout(timeout)
  }

  const data = (await resp.json().catch(() => null)) as
    | NunchakuImageResponse
    | null

  if (!resp.ok) {
    return {
      ok: false,
      status: resp.status,
      details: data?.error ?? data,
      message: `Avatar service returned ${resp.status}`,
      retryable: isRetryableStatus(resp.status),
    }
  }

  const imageBase64 = data?.data?.[0]?.b64_json

  if (!imageBase64) {
    return {
      ok: false,
      status: 502,
      details: data,
      message: "Avatar service did not return an image",
      retryable: false,
    }
  }

  return { ok: true, imageBase64 }
}

export async function POST(request: Request) {
  const apiKey = process.env.NUNCHAKU_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: "NUNCHAKU_API_KEY is not configured" },
      { status: 500 }
    )
  }

  let body: GenerateAvatarRequest

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 })
  }

  const prompt = body.prompt.trim()
  let lastFailure: Extract<AvatarAttemptResult, { ok: false }> | null = null

  for (let attempt = 1; attempt <= AVATAR_GENERATION_ATTEMPTS; attempt++) {
    const result = await requestAvatar(apiKey, prompt)

    if (result.ok) {
      return Response.json({ b64_json: result.imageBase64 })
    }

    lastFailure = result

    if (!result.retryable || attempt === AVATAR_GENERATION_ATTEMPTS) {
      break
    }

    await wait(600 * attempt)
  }

  const failure = lastFailure ?? {
    ok: false,
    retryable: true,
    message: "Avatar service request failed",
  }
  const clientFailure = getClientFailure(failure)

  return Response.json(
    {
      error: clientFailure.error,
      details: failure.details,
      upstreamStatus: failure.status,
    },
    { status: clientFailure.status }
  )
}
