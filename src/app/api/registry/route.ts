import { findExactDemoRegistryRecord } from "@/public-services";

export function GET(request: Request): Response {
  const identifier = new URL(request.url).searchParams.get("identifier") ?? "";
  if (!identifier.trim()) return Response.json({ error: "Enter an exact identifier." }, { status: 400 });
  const record = findExactDemoRegistryRecord(identifier);
  return Response.json({ record, disclaimer: "Synthetic local demonstration only. This is not a live government registry lookup or licence verification." });
}
