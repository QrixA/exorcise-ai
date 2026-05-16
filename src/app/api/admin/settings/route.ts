import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function verifyAdmin(request: NextRequest) {
  const sessionToken = request.cookies.get("exorcise.session_token")?.value;
  if (!sessionToken) return null;
  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isAdmin) return null;
  return session.user;
}

// GET — return current settings (from env vars, since settings are env-driven)
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    settings: {
      totpIssuer: process.env.TOTP_ISSUER || "Exorcise AI",
      require2fa: true, // Always true in this version
      syncInterval: parseInt(process.env.SHEET_SYNC_INTERVAL_HOURS || "6"),
    },
  });
}

// POST — save settings (note: env-based settings require server restart)
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { totpIssuer, syncInterval } = body;

    // Validate
    if (totpIssuer && typeof totpIssuer !== "string") {
      return NextResponse.json({ error: "Invalid TOTP issuer" }, { status: 400 });
    }
    if (syncInterval !== undefined && (typeof syncInterval !== "number" || syncInterval < 0 || syncInterval > 168)) {
      return NextResponse.json({ error: "Sync interval must be between 0 and 168 hours" }, { status: 400 });
    }

    // In a production app, these would be stored in DB and read at runtime.
    // For now, we return success — the admin should update .env and restart.
    return NextResponse.json({
      success: true,
      message: "Settings noted. Update your .env file with these values and restart the server for changes to take effect.",
      appliedSettings: {
        TOTP_ISSUER: totpIssuer || "Exorcise AI",
        SHEET_SYNC_INTERVAL_HOURS: syncInterval ?? 6,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
