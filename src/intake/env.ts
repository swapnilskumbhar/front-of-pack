import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1DatabaseLike } from "../data/d1";
import type { AnalysisJob, ImagesBindingLike, QueueLike, R2BucketLike } from "./contracts";

export interface IntakeBindings {
  DB: D1DatabaseLike;
  MEDIA: R2BucketLike;
  IMAGES: ImagesBindingLike;
  ANALYSIS_QUEUE: QueueLike<AnalysisJob>;
}

export async function getIntakeBindings(): Promise<IntakeBindings | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as unknown as Partial<IntakeBindings>;
    if (!bindings.DB || !bindings.MEDIA || !bindings.IMAGES || !bindings.ANALYSIS_QUEUE) return null;
    return bindings as IntakeBindings;
  } catch {
    return null;
  }
}
