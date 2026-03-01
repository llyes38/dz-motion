import { getKlingAuthHeader } from "@/lib/klingAuth";

const KLING_DEFAULT_BASE = "https://api-singapore.klingai.com";

/**
 * GET /api/health/kling
 * Ping auth: vérifie que le JWT est accepté par Kling (appel léger).
 * Retourne { ok: true } si 200/404, { ok: false, message } si 401 ou clés manquantes.
 */
export async function GET() {
  const auth = getKlingAuthHeader();
  if (!auth) {
    return Response.json(
      {
        ok: false as const,
        message: "KLING_ACCESS_KEY ou KLING_SECRET_KEY manquant",
      },
      { status: 503 }
    );
  }

  const base = (process.env.KLING_API_BASE_URL?.trim() || KLING_DEFAULT_BASE).replace(
    /\/$/,
    ""
  );
  const url = `${base}/v1/videos/00000000-0000-0000-0000-000000000000`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { ...auth, "Content-Type": "application/json" },
    });

    if (res.status === 401) {
      return Response.json(
        {
          ok: false as const,
          message: "JWT refusé (clé invalide ou expirée)",
        },
        { status: 503 }
      );
    }

    return Response.json({ ok: true as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur réseau";
    return Response.json(
      { ok: false as const, message },
      { status: 503 }
    );
  }
}
