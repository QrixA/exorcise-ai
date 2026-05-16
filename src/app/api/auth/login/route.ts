import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { sendSetPasswordEmail, sendPasswordResetEmail } from "@/lib/email";

// Check if email is pre-registered and what state they're in
export async function POST(request: NextRequest) {
  const { action, email, password, token, newPassword } = await request.json();

  if (action === "check-email") {
    if (!email) return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user || !user.isPreRegistered) {
      return NextResponse.json({
        allowed: false,
        message: "Akses ditolak. Email ini belum terdaftar di Exorcise AI Early Access.",
      });
    }

    if (!user.hasSetPassword) {
      // Generate token and send set-password email
      const setToken = crypto.randomBytes(32).toString("hex");
      await db.verification.create({
        data: {
          identifier: email.toLowerCase().trim(),
          value: setToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });
      await sendSetPasswordEmail(email, setToken, user.name || undefined);

      return NextResponse.json({
        allowed: true,
        needsPassword: true,
        message: "Email kamu sudah terdaftar! Cek inbox untuk set password pertamamu.",
      });
    }

    return NextResponse.json({
      allowed: true,
      needsPassword: false,
      hasTotpEnabled: user.hasTotpEnabled,
      onboardingDone: user.onboardingDone,
    });
  }

  if (action === "login") {
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password diperlukan" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    // Rate limiting check
    const recentAttempts = await db.verification.count({
      where: {
        identifier: `login-attempt:${email.toLowerCase()}`,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });
    if (recentAttempts >= 5) {
      return NextResponse.json({
        error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
      }, { status: 429 });
    }

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) {
      await db.verification.create({
        data: {
          identifier: `login-attempt:${email.toLowerCase()}`,
          value: "failed",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasTotpEnabled: user.hasTotpEnabled,
        onboardingDone: user.onboardingDone,
        hasSetPassword: user.hasSetPassword,
      },
      requireTotp: user.hasTotpEnabled,
      redirectTo: !user.onboardingDone ? "/onboarding" :
                  user.hasTotpEnabled ? "/login/verify" : "/chat",
    });

    response.cookies.set("exorcise.session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    // Store pending 2FA flag if needed
    if (user.hasTotpEnabled) {
      response.cookies.set("exorcise.pending_2fa", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 300, // 5 minutes to complete 2FA
        path: "/",
      });
    }

    return response;
  }

  if (action === "forgot-password") {
    if (!email) return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Always return success to prevent email enumeration
    if (user && user.hasSetPassword) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      await db.verification.create({
        data: {
          identifier: `reset:${email.toLowerCase().trim()}`,
          value: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
        },
      });
      await sendPasswordResetEmail(email, resetToken);
    }
    return NextResponse.json({
      success: true,
      message: "Jika email terdaftar, link reset password sudah dikirim.",
    });
  }

  if (action === "set-password") {
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token dan password diperlukan" }, { status: 400 });
    }

    const verification = await db.verification.findFirst({
      where: { value: token, expiresAt: { gte: new Date() } },
    });
    if (!verification) {
      return NextResponse.json({ error: "Link tidak valid atau sudah expired" }, { status: 400 });
    }

    const passwordHash = await bcryptjs.hash(newPassword, 12);
    await db.user.update({
      where: { email: verification.identifier },
      data: { passwordHash, hasSetPassword: true },
    });

    // Clean up verification
    await db.verification.delete({ where: { id: verification.id } });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
