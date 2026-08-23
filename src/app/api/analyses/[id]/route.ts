import { AnalysisRepository } from "@/data/analysis-repository";
import { authorizeWebAnalysis, getIntakeBindings, readBearerToken, type SafeAnalysisResponse } from "@/intake";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const bindings = await getIntakeBindings();
  if (!bindings) return Response.json({ error: "Analysis storage is not configured." }, { status: 503 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Analysis not found." }, { status: 404 });
  const accessToken = readBearerToken(request);
  if (!accessToken || !await authorizeWebAnalysis(bindings.DB, id, accessToken)) {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }
  const record = await new AnalysisRepository(bindings.DB).findById(id);
  if (!record) return Response.json({ error: "Analysis not found." }, { status: 404 });

  const response: SafeAnalysisResponse = {
    id: record.id,
    status: record.status,
    result: record.result,
    errorCode: record.errorCode,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  };
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
