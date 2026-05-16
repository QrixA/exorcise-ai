import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("exorcise.session_token")?.value;
  if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });
  if (!session || !session.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [total, preRegistered, onboarded, withPassword, with2fa] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isPreRegistered: true } }),
    db.user.count({ where: { onboardingDone: true } }),
    db.user.count({ where: { hasSetPassword: true } }),
    db.user.count({ where: { hasTotpEnabled: true } }),
  ]);

  const syncLogs = await db.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    stats: {
      total,
      preRegistered,
      onboarded,
      pendingOnboarding: preRegistered - onboarded,
      withPassword,
      with2fa,
    },
    syncLogs,
  });
}
