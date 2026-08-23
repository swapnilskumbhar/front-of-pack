export type TerraErrorCode =
  | "configuration_error"
  | "request_failed"
  | "invalid_provider_response"
  | "invalid_structured_output";

export class TerraError extends Error {
  readonly code: TerraErrorCode;
  readonly status: number | null;
  readonly responseId: string | null;

  constructor(
    code: TerraErrorCode,
    message: string,
    options: { cause?: unknown; status?: number; responseId?: string } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "TerraError";
    this.code = code;
    this.status = options.status ?? null;
    this.responseId = options.responseId ?? null;
  }
}
