/**
 * Kling API (motion control): image + reference video → generated video.
 * Uses official domain https://api-singapore.klingai.com and JWT from lib/klingAuth.
 */

import { getKlingAuthHeader } from "@/lib/klingAuth";

const KLING_DEFAULT_BASE = "https://api-singapore.klingai.com";

export type KlingJobStatus = "processing" | "completed" | "failed";

export interface KlingJobResult {
  status: KlingJobStatus;
  videoUrl?: string;
}

export interface CreateKlingJobParams {
  imageUrl: string;
  referenceVideoUrl: string;
  prompt: string;
}

export interface KlingApiError {
  code: number;
  message: string;
  details?: unknown;
}

function getBaseUrl(): string {
  const base =
    process.env.KLING_API_BASE_URL?.trim() || KLING_DEFAULT_BASE;
  return base.replace(/\/$/, "");
}

function getHeaders(): HeadersInit {
  const auth = getKlingAuthHeader();
  if (!auth) {
    throw new Error("Kling API not configured: set KLING_ACCESS_KEY and KLING_SECRET_KEY");
  }
  return {
    "Content-Type": "application/json",
    ...auth,
  };
}

function isOfficialKling(base: string): boolean {
  try {
    const host = new URL(base).hostname;
    return (
      host === "api.klingapi.com" ||
      host === "api-singapore.klingai.com" ||
      host.endsWith(".klingai.com")
    );
  } catch {
    return false;
  }
}

/**
 * Normalise l'image pour l'API Kling : si data URL (data:image/...;base64,XXX),
 * retourne uniquement la partie base64 XXX ; sinon retourne tel quel (URL).
 */
function normalizeImageForKling(imageUrl: string): string {
  const s = imageUrl.trim();
  if (s.startsWith("data:") && s.includes(",")) {
    return s.slice(s.indexOf(",") + 1);
  }
  return s;
}

/**
 * Create a Kling motion-control job (image + reference video).
 * Returns task ID for polling.
 */
export async function createKlingJob(
  params: CreateKlingJobParams
): Promise<string> {
  const { imageUrl, referenceVideoUrl, prompt } = params;
  const base = getBaseUrl();
  const official = isOfficialKling(base);

  const imagePayload = normalizeImageForKling(imageUrl);

  // Official Kling (api-singapore.klingai.com) : image2video, 5s, sans audio, modèle standard (moins cher)
  const path = official ? "/v1/videos/image2video" : "/v2/video/generations";
  const body = official
    ? {
        model: "kling-v2.6-std",
        image: imagePayload,
        prompt: prompt || "Person dancing, smooth movement, cultural dance",
        duration: 5,
        aspect_ratio: "9:16",
        mode: "std",
        reference_video_url: referenceVideoUrl,
      }
    : {
        model: "klingai/video-v2-6-standard-motion-control",
        image_url: imageUrl,
        video_url: referenceVideoUrl,
        character_orientation: "video" as const,
        prompt: prompt || "Person dancing, smooth movement, cultural dance",
        keep_audio: false,
      };

  const url = `${base}${path}`;
  const payloadString = JSON.stringify(body);
  const headers = getHeaders();
  if (!("Content-Type" in headers) || !(headers as Record<string, string>)["Content-Type"]) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  console.log("Kling URL:", url);
  console.log("Kling payload:", payloadString.slice(0, 2000));

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: payloadString,
  });

  const text = await res.text();
  console.log("Kling status:", res.status);
  console.log("Kling response:", text);

  type KlingResponseBody = {
    error?: { message?: string } | string;
    message?: string;
    msg?: string;
    code?: number;
    task_id?: string;
    id?: string;
    data?: { task_id?: string; id?: string };
    details?: unknown;
  };
  let errBody: KlingResponseBody;
  try {
    errBody = (text ? JSON.parse(text) : {}) as KlingResponseBody;
  } catch {
    errBody = {};
  }

  if (!res.ok) {
    const msg =
      (typeof errBody?.error === "object" && errBody?.error !== null && "message" in errBody.error
        ? (errBody.error as { message?: string }).message
        : null) ??
      errBody?.message ??
      errBody?.msg ??
      (typeof errBody?.error === "string" ? errBody.error : null) ??
      null;
    const apiCode = errBody?.code;
    let message: string;
    if (apiCode === 1102 || (msg && /balance not enough|insufficient|solde/i.test(String(msg)))) {
      message = "Solde du compte Kling insuffisant. Rechargez des crédits sur votre compte Kling (klingapi.com ou portail de votre fournisseur).";
    } else if (res.status === 401) {
      message = "Clé API invalide ou expirée. Vérifiez KLING_ACCESS_KEY, KLING_SECRET_KEY et KLING_API_BASE_URL.";
    } else if (msg && typeof msg === "string" && !/no message available/i.test(msg)) {
      message = msg;
    } else {
      message = `Erreur API Kling (${res.status}). Vérifiez vos clés et le domaine.`;
    }
    const error: KlingApiError = {
      code: res.status,
      message,
      details: errBody?.details ?? errBody?.error ?? (Object.keys(errBody).length ? errBody : undefined),
    };
    throw error;
  }

  const id =
    errBody?.task_id ?? errBody?.id ?? errBody?.data?.task_id ?? errBody?.data?.id;
  if (!id) {
    const error: KlingApiError = {
      code: 502,
      message: "Réponse Kling invalide: pas de task_id",
      details: errBody,
    };
    throw error;
  }
  return String(id);
}

/**
 * Get status and result of a Kling job.
 */
export async function getKlingJob(jobId: string): Promise<KlingJobResult> {
  const base = getBaseUrl();
  const official = isOfficialKling(base);

  const url = official
    ? `${base}/v1/videos/${encodeURIComponent(jobId)}`
    : `${base}/v2/video/generations?generation_id=${encodeURIComponent(jobId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
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

/**
 * Check if Kling auth is configured (for health check).
 */
export function hasKlingAuth(): boolean {
  return getKlingAuthHeader() !== null;
}
