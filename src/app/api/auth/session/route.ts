import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("exorcise.session_token")?.value;
  const pending2fa = request.cookies.get("exorcise.pending_2fa")?.value;

  if (!sessionToken) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: { select: {
      id: true, email: true, name: true, company: true, role: true,
      isAdmin: true, hasTotpEnabled: true, onboardingDone: true,
      hasSetPassword: true, image: true,
    }}},
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: session.user,
    pending2fa: !!pending2fa,
  });
}
