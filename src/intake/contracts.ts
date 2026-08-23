import type { AnalysisResult, AnalysisStatus } from "../domain/analysis";

export interface AnalysisJob {
  version: 1;
  analysis_id: string;
  attempt_number: number;
  trigger: "web";
}

export interface SafeAnalysisResponse {
  id: string;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreatedAnalysisResponse extends SafeAnalysisResponse {
  accessToken: string;
}

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

export interface QueueLike<T> {
  send(message: T): Promise<void>;
}

export interface ImageInfoLike {
  width: number;
  height: number;
  format?: string;
  fileSize?: number;
}

/** Structural subset used only to decode-check original image dimensions. */
export interface ImagesBindingLike {
  info(stream: ReadableStream<Uint8Array>): Promise<ImageInfoLike>;
}
