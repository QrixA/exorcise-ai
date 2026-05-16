import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSheetData } from "@/lib/sheets";

// Admin-authenticated sync trigger (no secret header needed — uses session auth)
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

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await readSheetData();
    let created = 0, updated = 0, skipped = 0;

    for (const row of rows) {
      const existing = await db.user.findUnique({
        where: { email: row.email },
      });

      if (!existing) {
        await db.user.create({
          data: {
            email: row.email,
            name: row.name || null,
            company: row.company || null,
            role: row.role || null,
            interests: row.interests || null,
            isPreRegistered: true,
            hasSetPassword: false,
            emailVerified: false,
          },
        });
        created++;
      } else {
        const updates: Record<string, string> = {};
        if (!existing.name && row.name) updates.name = row.name;
        if (!existing.company && row.company) updates.company = row.company;
        if (!existing.role && row.role) updates.role = row.role;
        if (!existing.interests && row.interests) updates.interests = row.interests;

        if (Object.keys(updates).length > 0) {
          await db.user.update({
            where: { email: row.email },
            data: updates,
          });
          updated++;
        } else {
          skipped++;
        }
      }
    }

    const synced = created + updated;

    await db.syncLog.create({
      data: { synced, created, updated, skipped },
    });

    return NextResponse.json({
      success: true,
      synced,
      created,
      updated,
      skipped,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sheet sync error:", message);

    await db.syncLog.create({
      data: { synced: 0, created: 0, updated: 0, skipped: 0, errors: message },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
