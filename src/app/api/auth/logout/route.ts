import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("exorcise.session_token")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Delete session from DB
  try {
    await db.session.delete({ where: { token: sessionToken } });
  } catch {
    // Session may already be deleted, ignore
  }

  // Clear cookies
  const response = NextResponse.json({ success: true });
  response.cookies.delete("exorcise.session_token");
  response.cookies.delete("exorcise.pending_2fa");
  return response;
}
