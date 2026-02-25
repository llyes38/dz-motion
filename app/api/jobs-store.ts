export type JobStatus = "processing" | "completed" | "failed";

export interface JobEntry {
  status: JobStatus;
  createdAt: Date;
  videoUrl?: string;
}

export const jobs = new Map<string, JobEntry>();
