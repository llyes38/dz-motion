import { getKlingJob } from "@/lib/providers/runware";

export async function POST(request: Request) {
  let body: { jobId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { jobId } = body;
  if (!jobId) {
    return Response.json(
      { error: "jobId is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { status: "failed" as const },
      { status: 200 }
    );
  }

  try {
    const result = await getKlingJob(apiKey, jobId);

    if (result.status === "completed" && result.videoUrl) {
      return Response.json({
        status: "completed" as const,
        videoUrl: result.videoUrl,
      });
    }

    if (result.status === "failed") {
      return Response.json({ status: "failed" as const });
    }

    return Response.json({ status: "processing" as const });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    if (process.env.NODE_ENV !== "production") {
      console.error("[runware] getKlingJob error:", message);
    }
    return Response.json(
      { status: "processing" as const },
      { status: 200 }
    );
  }
}
