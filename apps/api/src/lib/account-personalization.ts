import { z } from "zod";
import jpeg from "jpeg-js";

export const preferenceInput = z
  .object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    initialize_theme: z.enum(["light", "dark", "system"]).optional(),
    accent: z.enum(["track", "forest", "sea", "ink"]).optional(),
    reminder_enabled: z.boolean().optional(),
    reminder_time: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/)
      .optional(),
    timezone: z
      .string()
      .min(1)
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export function googlePicture(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com"))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export const MAX_AVATAR_BYTES = 128 * 1024;
/** 강성호 2026-10-14: 확장자가 아닌 실제 JPEG를 제한된 메모리로 디코딩하고 메타데이터 없이 재인코딩한다. */
export function normalizeAvatar(bytes: Uint8Array): Uint8Array {
  if (
    bytes.length > MAX_AVATAR_BYTES ||
    bytes.length < 4 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes[bytes.length - 2] !== 255 ||
    bytes[bytes.length - 1] !== 217
  )
    throw new Error("Invalid JPEG");
  const decoded = jpeg.decode(bytes, {
    useTArray: true,
    tolerantDecoding: false,
    maxResolutionInMP: 0.07,
    maxMemoryUsageInMB: 8,
  });
  if (decoded.width !== 256 || decoded.height !== 256)
    throw new Error("Avatar must be 256 x 256");
  const clean = jpeg.encode(
    { width: 256, height: 256, data: decoded.data },
    85,
  ).data;
  if (clean.length > MAX_AVATAR_BYTES) throw new Error("Avatar too large");
  return new Uint8Array(clean);
}

export async function boundedAvatarBody(request: Request): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > MAX_AVATAR_BYTES)
    throw new Error("Avatar too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing JPEG");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_AVATAR_BYTES) {
        await reader.cancel();
        throw new Error("Avatar too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
