import CryptoJS from "crypto-js";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || "default-32-char-key-change-this!!";
const TOTP_ISSUER = process.env.TOTP_ISSUER || "Exorcise AI";

export function encryptSecret(secret: string): string {
  return CryptoJS.AES.encrypt(secret, ENCRYPTION_KEY).toString();
}

export function decryptSecret(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function generateTOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function createTOTP(secret: string, email: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function verifyTOTP(secret: string, token: string, email: string): boolean {
  const totp = createTOTP(secret, email);
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export async function generateQRCodeDataURL(secret: string, email: string): Promise<string> {
  const totp = createTOTP(secret, email);
  const uri = totp.toString();
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: "#e2e8f0", light: "#080810" },
  });
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Array.from({ length: 8 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
    ).join("");
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export function hashBackupCodes(codes: string[]): string {
  return JSON.stringify(
    codes.map((code) => CryptoJS.SHA256(code.replace("-", "")).toString())
  );
}

export function verifyBackupCode(code: string, hashedCodes: string): { valid: boolean; remaining: string } {
  const hashes: string[] = JSON.parse(hashedCodes);
  const inputHash = CryptoJS.SHA256(code.replace("-", "")).toString();
  const idx = hashes.indexOf(inputHash);
  if (idx === -1) return { valid: false, remaining: hashedCodes };
  hashes.splice(idx, 1);
  return { valid: true, remaining: JSON.stringify(hashes) };
}
