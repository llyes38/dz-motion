import { createKlingJob, hasKlingAuth } from "@/lib/providers/kling";
import type { KlingApiError } from "@/lib/providers/kling";

/** Base URL of the app so Kling can fetch reference videos. No trailing slash. */
function getReferenceVideoUrls(): Record<string, string> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://example.com";
  return {
    chaoui: `${base}/reference/chaoui.mp4`,
    kabyle: `${base}/reference/kabyle.mp4`,
    assimi: `${base}/reference/assimi.mp4`,
    naili: `${base}/reference/naili.mp4`,
  };
}

const DEFAULT_PROMPT =
  "Person dancing, Algeria, smooth movement, cultural dance";

const DANCE_PROMPTS: Record<string, string> = {
  chaoui:
    "Person doing traditional Chaoui dance from Algeria, smooth rhythmic movement, cultural dance",
  kabyle:
    "Person doing traditional Kabyle dance from Algeria, elegant movement, cultural dance",
  assimi:
    "Person doing 'Assimi dance from Algeria, rhythmic movement, cultural dance",
  naili:
    "Person doing traditional Naili dance from Algeria, smooth movement, cultural dance",
};

function isPublicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isKlingApiError(err: unknown): err is KlingApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err
  );
}

export async function POST(request: Request) {
  if (!hasKlingAuth()) {
    return Response.json(
      {
        ok: false as const,
        code: 503,
        message: "Kling non configuré : définir KLING_ACCESS_KEY et KLING_SECRET_KEY",
        details: null,
      },
      { status: 503 }
    );
  }

  let body: { danceId?: string; imageUrl?: string; imageDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false as const, code: 400, message: "Corps JSON invalide", details: null },
      { status: 400 }
    );
  }

  const { danceId, imageUrl, imageDataUrl } = body;

  if (!danceId) {
    return Response.json(
      { ok: false as const, code: 400, message: "danceId requis", details: null },
      { status: 400 }
    );
  }

  let imageSource: string | undefined;
  if (imageUrl !== undefined) {
    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return Response.json(
        { ok: false as const, code: 400, message: "imageUrl doit être une chaîne non vide", details: null },
        { status: 400 }
      );
    }
    if (!isPublicUrl(imageUrl)) {
      return Response.json(
        { ok: false as const, code: 400, message: "imageUrl doit être une URL publique http(s)", details: null },
        { status: 400 }
      );
    }
    imageSource = imageUrl.trim();
  } else if (
    imageDataUrl !== undefined &&
    typeof imageDataUrl === "string" &&
    imageDataUrl.trim()
  ) {
    imageSource = imageDataUrl.trim();
  }

  if (!imageSource) {
    return Response.json(
      { ok: false as const, code: 400, message: "imageUrl ou imageDataUrl requis", details: null },
      { status: 400 }
    );
  }

  const referenceVideoUrls = getReferenceVideoUrls();
  const referenceVideoUrl =
    referenceVideoUrls[danceId] ?? referenceVideoUrls.chaoui;
  const prompt = DANCE_PROMPTS[danceId] ?? DEFAULT_PROMPT;

  try {
    const jobId = await createKlingJob({
      imageUrl: imageSource,
      referenceVideoUrl,
      prompt,
    });
    console.log("[kling] generate started", { danceId, jobId: jobId.slice(0, 8) + "..." });
    return Response.json({ ok: true as const, jobId }, { status: 201 });
  } catch (err) {
    if (isKlingApiError(err)) {
      console.error("[kling] createKlingJob error", err.code, err.message, err.details);
      return Response.json(
        {
          ok: false as const,
          code: err.code,
          message: err.message,
          details: err.details ?? null,
        },
        { status: err.code >= 500 ? 502 : 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Échec du démarrage de la génération";
    console.error("[kling] createKlingJob error", message);
    return Response.json(
      {
        ok: false as const,
        code: 502,
        message,
        details: null,
      },
      { status: 502 }
    );
  }
}
