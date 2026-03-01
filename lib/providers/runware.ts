const RUNWARE_API_URL = "https://api.runware.ai/v1";
const KLING_MODEL = "klingai:kling-video@2.6-pro";

export type KlingJobStatus = "processing" | "completed" | "failed";

export interface KlingJobResult {
  status: KlingJobStatus;
  videoUrl?: string;
}

export interface CreateKlingJobParams {
  /** Public image URL or data URL (data:image/...) */
  imageUrl: string;
  /** Placeholder or public URL of reference video for motion */
  referenceVideoUrl: string;
  /** Positive prompt for the generation */
  prompt: string;
}

function getHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Upload image to Runware and return imageUUID.
 * imageSource can be a public http(s) URL or a data URL.
 */
async function uploadImage(
  apiKey: string,
  imageSource: string
): Promise<string> {
  const taskUUID = crypto.randomUUID();
  const res = await fetch(RUNWARE_API_URL, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify([
      {
        taskType: "imageUpload",
        taskUUID,
        image: imageSource,
      },
    ]),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.errors?.[0]?.message ?? `Image upload failed (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const imageUUID = data?.data?.imageUUID ?? data?.data?.[0]?.imageUUID;
  if (!imageUUID) {
    const msg = data?.errors?.[0]?.message ?? "Image upload did not return imageUUID";
    throw new Error(msg);
  }

  return imageUUID;
}

/**
 * Create a Kling 2.6 Pro video job (image + reference video).
 * Returns the Runware taskUUID to use as jobId for polling.
 */
export async function createKlingJob(
  apiKey: string,
  params: CreateKlingJobParams
): Promise<string> {
  const { imageUrl, referenceVideoUrl, prompt } = params;

  const imageUUID = await uploadImage(apiKey, imageUrl);

  const jobId = crypto.randomUUID();
  const body = [
    {
      taskType: "videoInference",
      taskUUID: jobId,
      model: KLING_MODEL,
      deliveryMethod: "async",
      positivePrompt: prompt,
      numberResults: 1,
      duration: 5,
      frameImages: [
        { inputImage: imageUUID, frame: "first" as const },
      ],
      inputs: {
        referenceVideos: [referenceVideoUrl],
      },
      providerSettings: {
        klingai: { characterOrientation: "video" as const, sound: false },
      },
    },
  ];

  const res = await fetch(RUNWARE_API_URL, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.errors?.[0]?.message ?? `Video inference failed to start (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  if (data?.errors?.length) {
    const msg = data.errors[0]?.message ?? "Video inference error";
    throw new Error(msg);
  }

  return jobId;
}

/**
 * Get status and result of a Kling job (Runware taskUUID).
 */
export async function getKlingJob(
  apiKey: string,
  jobId: string
): Promise<KlingJobResult> {
  const res = await fetch(RUNWARE_API_URL, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify([{ taskType: "getResponse", taskUUID: jobId }]),
  });

  if (!res.ok) {
    return { status: "processing" };
  }

  const data = await res.json();

  if (data?.errors?.length) {
    const forThisTask = data.errors.some(
      (e: { taskUUID?: string }) => e.taskUUID === jobId
    );
    if (forThisTask) return { status: "failed" };
  }

  if (data?.data?.length) {
    const task = data.data.find(
      (t: { taskUUID?: string }) => t.taskUUID === jobId
    );
    if (task) {
      if (task.status === "success" && task.videoURL) {
        return { status: "completed", videoUrl: task.videoURL };
      }
      if (task.status === "processing") {
        return { status: "processing" };
      }
    }
  }

  return { status: "processing" };
}
