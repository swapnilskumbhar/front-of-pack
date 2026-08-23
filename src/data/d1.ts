/** Minimal structural subset of Cloudflare D1 used by repositories. */
export interface D1RunMeta {
  changes?: number;
}

export interface D1RunResult {
  success: boolean;
  meta?: D1RunMeta;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1RunResult>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement;
}

export function changedExactlyOne(result: D1RunResult): boolean {
  return result.success && result.meta?.changes === 1;
}
