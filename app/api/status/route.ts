import { getKlingJob } from "@/lib/providers/kling";

export async function POST(request: Request) {
  let body: { jobId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false as const, code: 400, message: "Corps JSON invalide", details: null },
      { status: 400 }
    );
  }

  const { jobId } = body;
  if (!jobId) {
    return Response.json(
      { ok: false as const, code: 400, message: "jobId requis", details: null },
      { status: 400 }
    );
  }

  try {
    const result = await getKlingJob(jobId);

    if (result.status === "completed" && result.videoUrl) {
      return Response.json({
        ok: true as const,
        status: "completed" as const,
        videoUrl: result.videoUrl,
      });
    }

    if (result.status === "failed") {
      return Response.json({
        ok: true as const,
        status: "failed" as const,
        message: "La génération a échoué.",
        details: null,
      });
    }

    return Response.json({
      ok: true as const,
      status: "processing" as const,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la vérification du statut";
    console.error("[kling] getKlingJob error", jobId, message);
    return Response.json(
      {
        ok: true as const,
        status: "processing" as const,
      },
      { status: 200 }
    );
  }
}
