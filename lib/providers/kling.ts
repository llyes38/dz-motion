/**
 * Kling API (motion control): image + reference video → generated video.
 * Supports:
 * - Official Kling: KLING_ACCESS_KEY + KLING_SECRET_KEY (JWT)
 * - Gateway (AIML): KLING_API_KEY (single Bearer key)
 *
 * Env: KLING_API_KEY OR (KLING_ACCESS_KEY + KLING_SECRET_KEY), KLING_API_BASE_URL (optional).
 */

import { createHmac } from "crypto";

const DEFAULT_BASE = "https://api.aimlapi.com";

export type KlingJobStatus = "processing" | "completed" | "failed";

export interface KlingJobResult {
  status: KlingJobStatus;
  videoUrl?: string;
}

export interface CreateKlingJobParams {
  /** Public image URL or data URL (data:image/...) */
  imageUrl: string;
  /** Public URL of reference video for motion transfer */
  referenceVideoUrl: string;
  /** Optional prompt (scene / motion description) */
  prompt: string;
}

function getBaseUrl(): string {
  return (process.env.KLING_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
}

function isOfficialKling(base: string): boolean {
  try {
    return new URL(base).hostname === "api.klingapi.com";
  } catch {
    return false;
  }
}

function getHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** Base64URL encode (no padding). */
function base64UrlEncode(data: Uint8Array | string): string {
  const raw =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const b64 = Buffer.from(raw).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build a JWT signed with HS256 (for official Kling API). Uses Node crypto for Node 18+.
 */
function signJwt(accessKey: string, secretKey: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: accessKey, iat: now, exp: now + 5 * 60 };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;
  const sig = createHmac("sha256", secretKey).update(message).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${message}.${sigB64}`;
}

/**
 * Returns the Bearer token to use: either KLING_API_KEY or a JWT from
 * KLING_ACCESS_KEY + KLING_SECRET_KEY. Returns null if none configured.
 */
export function getKlingAuthToken(): string | null {
  const single = process.env.KLING_API_KEY?.trim();
  if (single) return single;

  const access = process.env.KLING_ACCESS_KEY?.trim();
  const secret = process.env.KLING_SECRET_KEY?.trim();
  if (access && secret) return signJwt(access, secret);

  return null;
}

/**
 * Create a Kling 2.6 Pro motion-control job (image + reference video).
 * Returns task/generation ID for polling.
 */
export async function createKlingJob(
  authToken: string,
  params: CreateKlingJobParams
): Promise<string> {
  const { imageUrl, referenceVideoUrl, prompt } = params;
  const base = getBaseUrl();
  const official = isOfficialKling(base);

  let path: string;
  let body: Record<string, unknown>;

  if (official) {
    path = "/v1/videos/motion-create";
    body = {
      image_url: imageUrl,
      motion_url: referenceVideoUrl,
      prompt: prompt || "Person dancing, smooth movement, cultural dance",
      keep_audio: false,
      motion_direction: "video" as const,
      mode: "professional" as const,
    };
  } else {
    path = "/v2/video/generations";
    body = {
      model: "klingai/video-v2-6-pro-motion-control",
      image_url: imageUrl,
      video_url: referenceVideoUrl,
      character_orientation: "video" as const,
      prompt: prompt || "Person dancing, smooth movement, cultural dance",
      keep_audio: false,
    };
  }

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: getHeaders(authToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err?.error?.message ??
      err?.message ??
      err?.msg ??
      `Video generation failed to start (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const id =
    data?.task_id ?? data?.id ?? data?.data?.task_id ?? data?.data?.id;
  if (!id) {
    throw new Error("No task/generation id in response");
  }
  return String(id);
}

/**
 * Get status and result of a Kling job (task/generation id).
 */
export async function getKlingJob(
  authToken: string,
  jobId: string
): Promise<KlingJobResult> {
  const base = getBaseUrl();
  const official = isOfficialKling(base);

  const url = official
    ? `${base}/v1/videos/${encodeURIComponent(jobId)}`
    : `${base}/v2/video/generations?generation_id=${encodeURIComponent(jobId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(authToken),
  });

  if (!res.ok) {
    return { status: "processing" };
  }

  const data = await res.json();
  const status =
    data?.status ?? data?.data?.status ?? data?.task_status?.toLowerCase();

  if (
    status === "completed" ||
    status === "success" ||
    status === "succeeded"
  ) {
    const videoUrl =
      data?.video_url ??
      data?.video?.url ??
      data?.data?.video_url ??
      data?.data?.video?.url ??
      data?.data?.response?.[0] ??
      data?.result?.video_url;
    if (videoUrl) {
      return { status: "completed", videoUrl };
    }
  }

  if (status === "error" || status === "failed" || status === "FAILED") {
    return { status: "failed" };
  }

  return { status: "processing" };
}
