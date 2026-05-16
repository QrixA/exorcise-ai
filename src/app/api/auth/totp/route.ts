import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateTOTPSecret, encryptSecret, decryptSecret,
  generateQRCodeDataURL, verifyTOTP,
  generateBackupCodes, hashBackupCodes, verifyBackupCode,
} from "@/lib/totp";

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
  const { action, code } = await request.json();

  if (action === "setup") {
    // Generate new TOTP secret
    const secret = generateTOTPSecret();
    const encrypted = encryptSecret(secret);

    // Upsert TOTP credential
    await db.totpCredential.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secret: encrypted, verified: false },
      update: { secret: encrypted, verified: false },
    });

    const qrCode = await generateQRCodeDataURL(secret, user.email);

    return NextResponse.json({
      success: true,
      qrCode,
      manualKey: secret,
    });
  }

  if (action === "verify-setup") {
    if (!code) return NextResponse.json({ error: "Kode diperlukan" }, { status: 400 });

    const cred = await db.totpCredential.findUnique({ where: { userId: user.id } });
    if (!cred) return NextResponse.json({ error: "TOTP not set up" }, { status: 400 });

    const secret = decryptSecret(cred.secret);
    const valid = verifyTOTP(secret, code, user.email);

    if (!valid) {
      return NextResponse.json({ error: "Kode tidak valid. Coba lagi." }, { status: 400 });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(8);
    const hashedCodes = hashBackupCodes(backupCodes);

    await db.totpCredential.update({
      where: { userId: user.id },
      data: { verified: true, backupCodes: hashedCodes },
    });

    await db.user.update({
      where: { id: user.id },
      data: { hasTotpEnabled: true, onboardingDone: true },
    });

    return NextResponse.json({
      success: true,
      backupCodes,
    });
  }

  if (action === "verify-login") {
    if (!code) return NextResponse.json({ error: "Kode diperlukan" }, { status: 400 });

    // Rate limiting for TOTP
    const recentAttempts = await db.verification.count({
      where: {
        identifier: `totp-attempt:${user.id}`,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recentAttempts >= 5) {
      return NextResponse.json({
        error: "Terlalu banyak percobaan. Coba lagi dalam 10 menit.",
      }, { status: 429 });
    }

    const cred = await db.totpCredential.findUnique({ where: { userId: user.id } });
    if (!cred || !cred.verified) {
      return NextResponse.json({ error: "2FA not configured" }, { status: 400 });
    }

    const secret = decryptSecret(cred.secret);
    const valid = verifyTOTP(secret, code, user.email);

    if (!valid) {
      await db.verification.create({
        data: {
          identifier: `totp-attempt:${user.id}`,
          value: "failed",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      return NextResponse.json({ error: "Kode tidak valid" }, { status: 400 });
    }

    // Clear pending 2FA flag
    const response = NextResponse.json({ success: true, redirectTo: "/chat" });
    response.cookies.delete("exorcise.pending_2fa");
    return response;
  }

  if (action === "verify-backup") {
    if (!code) return NextResponse.json({ error: "Recovery code diperlukan" }, { status: 400 });

    const cred = await db.totpCredential.findUnique({ where: { userId: user.id } });
    if (!cred || !cred.backupCodes) {
      return NextResponse.json({ error: "No backup codes" }, { status: 400 });
    }

    const { valid, remaining } = verifyBackupCode(code, cred.backupCodes);
    if (!valid) {
      return NextResponse.json({ error: "Recovery code tidak valid" }, { status: 400 });
    }

    await db.totpCredential.update({
      where: { userId: user.id },
      data: { backupCodes: remaining },
    });

    const response = NextResponse.json({ success: true, redirectTo: "/chat" });
    response.cookies.delete("exorcise.pending_2fa");
    return response;
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
