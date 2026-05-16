import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function baseTemplate(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080810;font-family:'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#0e0e1a;border:1px solid #2d2d4a;border-radius:12px;overflow:hidden;">
<div style="padding:32px;text-align:center;border-bottom:1px solid #2d2d4a;">
<div style="font-size:36px;margin-bottom:8px;">👻</div>
<h1 style="color:#c084fc;font-size:24px;margin:0;letter-spacing:2px;">Exorcise AI</h1>
<p style="color:#64748b;font-size:13px;margin:4px 0 0;">Summon the answer. Banish the unknown.</p>
</div>
<div style="padding:32px;color:#e2e8f0;font-size:15px;line-height:1.7;">
${content}
</div>
<div style="padding:20px 32px;border-top:1px solid #2d2d4a;text-align:center;">
<p style="color:#475569;font-size:12px;margin:0;">© 2025 Exorcise AI — All rights reserved.</p>
</div>
</div></body></html>`;
}

export async function sendSetPasswordEmail(email: string, token: string, name?: string): Promise<void> {
  const link = `${APP_URL}/onboarding?token=${token}`;
  const greeting = name ? `Hei ${name}` : "Hei";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Exorcise AI" <noreply@exorcise.ai>',
    to: email,
    subject: "👻 Selamat datang di Exorcise AI — Set password kamu",
    html: baseTemplate(`
      <h2 style="color:#c084fc;margin:0 0 16px;">Selamat Datang! 🎉</h2>
      <p>${greeting}, kamu telah terdaftar di <strong style="color:#a855f7;">Exorcise AI Early Access</strong>.</p>
      <p>Klik tombol di bawah untuk set password dan mulai menggunakan platform:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Set Password & Mulai →</a>
      </div>
      <p style="color:#64748b;font-size:13px;">Link ini berlaku selama 24 jam. Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
    `),
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Exorcise AI" <noreply@exorcise.ai>',
    to: email,
    subject: "🔑 Reset password Exorcise AI kamu",
    html: baseTemplate(`
      <h2 style="color:#c084fc;margin:0 0 16px;">Reset Password 🔑</h2>
      <p>Kami menerima permintaan reset password untuk akun Exorcise AI kamu.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${link}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Reset Password →</a>
      </div>
      <p style="color:#64748b;font-size:13px;">Link ini berlaku selama 1 jam. Jika kamu tidak meminta reset, abaikan email ini.</p>
    `),
  });
}

export async function sendNewLoginEmail(email: string, ip: string, userAgent: string): Promise<void> {
  const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Exorcise AI" <noreply@exorcise.ai>',
    to: email,
    subject: "⚠️ Login baru ke akun Exorcise AI kamu",
    html: baseTemplate(`
      <h2 style="color:#c084fc;margin:0 0 16px;">Login Baru Terdeteksi ⚠️</h2>
      <p>Akun Exorcise AI kamu baru saja diakses:</p>
      <div style="background:#1a1a2e;border:1px solid #2d2d4a;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;"><strong style="color:#a855f7;">🕐 Waktu:</strong> ${time}</p>
        <p style="margin:4px 0;"><strong style="color:#a855f7;">🌐 IP:</strong> ${ip}</p>
        <p style="margin:4px 0;"><strong style="color:#a855f7;">📱 Device:</strong> ${userAgent.substring(0, 100)}</p>
      </div>
      <p>Jika bukan kamu, segera amankan akunmu.</p>
    `),
  });
}
