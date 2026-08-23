import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest, NextResponse } from "next/server";
import { constantTimeEqual, createOfficerSession, OFFICER_COOKIE, OFFICER_SESSION_SECONDS } from "@/public-services";

interface OfficerEnv { OFFICER_DEMO_USER?: string; OFFICER_DEMO_PASS?: string; OFFICER_SESSION_SECRET?: string; }
async function env(): Promise<OfficerEnv> { try { return (await getCloudflareContext({ async:true })).env as OfficerEnv; } catch { return process.env as unknown as OfficerEnv; } }

export async function POST(request: NextRequest): Promise<Response> {
  const config = await env();
  if (!config.OFFICER_DEMO_USER || !config.OFFICER_DEMO_PASS || !config.OFFICER_SESSION_SECRET) return NextResponse.json({error:"Officer demo is not configured."},{status:503});
  let body: {username?:string;password?:string}; try { body=await request.json(); } catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
  if (!body.username || !body.password || !constantTimeEqual(body.username, config.OFFICER_DEMO_USER) || !constantTimeEqual(body.password, config.OFFICER_DEMO_PASS)) return NextResponse.json({error:"Invalid credentials."},{status:401});
  const response=NextResponse.json({authenticated:true}); response.cookies.set(OFFICER_COOKIE,await createOfficerSession(body.username,config.OFFICER_SESSION_SECRET),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:OFFICER_SESSION_SECONDS}); return response;
}
export async function DELETE(): Promise<Response> { const response=NextResponse.json({authenticated:false}); response.cookies.set(OFFICER_COOKIE,"",{httpOnly:true,path:"/",maxAge:0}); return response; }
