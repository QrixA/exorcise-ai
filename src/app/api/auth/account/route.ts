import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("exorcise.session_token")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const user = session.user;
  const { action, currentPassword, newPassword } = await request.json();

  if (action === "change-password") {
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Password saat ini dan password baru diperlukan" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
    }

    if (!user.passwordHash) {
      return NextResponse.json({ error: "Password belum di-set" }, { status: 400 });
    }

    const valid = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
    }

    const passwordHash = await bcryptjs.hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
