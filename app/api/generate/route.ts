import { createKlingJob } from "@/lib/providers/runware";

/** Base URL of the app (e.g. https://dz-motion.vercel.app) so Runware can fetch reference videos from /reference/*. No trailing slash. */
function getReferenceVideoUrls(): Record<string, string> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://example.com";
  return {
    chaoui: `${base}/reference/chaoui.mp4`,
    kabyle: `${base}/reference/kabyle.mp4`,
    assimi: `${base}/reference/assimi.mp4`,
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
};

function isPublicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Runware API key not configured" },
      { status: 503 }
    );
  }

  let body: { danceId?: string; imageUrl?: string; imageDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { danceId, imageUrl, imageDataUrl } = body;

  if (!danceId) {
    return Response.json(
      { error: "danceId is required" },
      { status: 400 }
    );
  }

  // Accept either imageUrl (must be http(s)) or imageDataUrl (for backward compat / UI)
  let imageSource: string | undefined;
  if (imageUrl !== undefined) {
    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return Response.json(
        { error: "imageUrl must be a non-empty string" },
        { status: 400 }
      );
    }
    if (!isPublicUrl(imageUrl)) {
      return Response.json(
        { error: "imageUrl must be a public http or https URL" },
        { status: 400 }
      );
    }
    imageSource = imageUrl.trim();
  } else if (imageDataUrl !== undefined && typeof imageDataUrl === "string" && imageDataUrl.trim()) {
    imageSource = imageDataUrl.trim();
  }

  if (!imageSource) {
    return Response.json(
      { error: "imageUrl or imageDataUrl is required" },
      { status: 400 }
    );
  }

  const referenceVideoUrls = getReferenceVideoUrls();
  const referenceVideoUrl =
    referenceVideoUrls[danceId] ?? referenceVideoUrls.chaoui;
  const prompt = DANCE_PROMPTS[danceId] ?? DEFAULT_PROMPT;

  try {
    const jobId = await createKlingJob(apiKey, {
      imageUrl: imageSource,
      referenceVideoUrl,
      prompt,
    });
    return Response.json({ jobId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Video generation failed to start";
    if (process.env.NODE_ENV !== "production") {
      console.error("[runware] createKlingJob error:", message);
    }
    return Response.json(
      { error: message },
      { status: 502 }
    );
  }
}
