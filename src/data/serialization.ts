import { MAX_SERIALIZED_ANALYSIS_BYTES } from "../domain/analysis";

const encoder = new TextEncoder();

export class AnalysisPayloadTooLargeError extends Error {
  readonly code = "ANALYSIS_PAYLOAD_TOO_LARGE";

  constructor(
    readonly actualBytes: number,
    readonly maximumBytes = MAX_SERIALIZED_ANALYSIS_BYTES,
  ) {
    super(`Serialized analysis is ${actualBytes} bytes; maximum is ${maximumBytes}`);
    this.name = "AnalysisPayloadTooLargeError";
  }
}

export type SerializedAnalysisColumns = Readonly<Record<string, string>>;

export function serializeJson(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("Analysis value is not JSON-serializable");
  }
  return serialized;
}

/** Mirrors the migration's aggregate application-level cap for analysis JSON. */
export function assertAnalysisPayloadSize(
  columns: SerializedAnalysisColumns,
): number {
  const bytes = Object.values(columns).reduce(
    (total, value) => total + encoder.encode(value).byteLength,
    0,
  );

  if (bytes > MAX_SERIALIZED_ANALYSIS_BYTES) {
    throw new AnalysisPayloadTooLargeError(bytes);
  }

  return bytes;
}
