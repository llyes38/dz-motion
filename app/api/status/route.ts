import { getKlingJob, getKlingAuthToken } from "@/lib/providers/kling";

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

  const authToken = getKlingAuthToken();
  if (!authToken) {
    return Response.json(
      { status: "failed" as const },
      { status: 200 }
    );
  }

  try {
    const result = await getKlingJob(authToken, jobId);

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
      console.error("[kling] getKlingJob error:", message);
    }
    return Response.json(
      { status: "processing" as const },
      { status: 200 }
    );
  }
}
