import { Hono } from "hono";
import { OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../types.js";
import { cfAccessAuth } from "../middleware/auth.js";
import { ok, badRequest, notFound, conflict } from "../lib/response.js";
import {
  preferenceInput,
  normalizeAvatar,
  boundedAvatarBody,
} from "../lib/account-personalization.js";
import {
  dataResponseSchema,
  mountLegacyRouteWithOpenApiDocs,
  problemSchema,
} from "./openapi-docs.js";

const routes = new Hono<AppEnv>();
routes.use("/account/*", cfAccessAuth);
routes.use("/account/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  c.header("Vary", "Cookie");
  // 늦게 도착한 다른 계정의 쓰기는 현재 로그인 계정에 적용하지 않는다.
  const expected = c.req.header("X-Account-Id");
  if (expected && expected !== c.get("userId"))
    return conflict(c, "Account changed; reload before saving");
  return next();
});
async function preferences(db: D1Database, user: string, track: string) {
  const row = await db
    .prepare(
      `SELECT theme,accent,reminder_enabled,reminder_time,timezone,custom_reminder_configured
    FROM account_preferences WHERE user_id=?`,
    )
    .bind(user)
    .first<Record<string, unknown>>();
  return row
    ? {
        ...row,
        reminder_enabled: row.reminder_enabled === 1,
        custom_reminder_configured: row.custom_reminder_configured === 1,
      }
    : {
        theme: null,
        accent: null,
        reminder_enabled: false,
        reminder_time: "19:00",
        timezone: track === "topik-ko" ? "Asia/Tokyo" : "Asia/Seoul",
        custom_reminder_configured: false,
      };
}
routes.get("/account/preferences", async (c) =>
  ok(c, await preferences(c.env.DB, c.get("userId"), c.get("learningTrack"))),
);
routes.put("/account/preferences", async (c) => {
  const input = preferenceInput.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return badRequest(c, "Invalid account preferences");
  const body = input.data;
  const keys = (Object.keys(body) as (keyof typeof body)[]).filter(
    (k) => k !== "initialize_theme",
  );
  if (body.initialize_theme && keys.length)
    return badRequest(c, "Theme initialization must be a separate request");
  const custom = keys.some(
    (k) => k.startsWith("reminder_") || k === "timezone",
  );
  const timezone =
    body.timezone ??
    (c.get("learningTrack") === "topik-ko" ? "Asia/Tokyo" : "Asia/Seoul");
  // 한 UPSERT로 필드 단위 변경: 다른 기기의 테마 저장이 알림 설정을 덮어쓰지 않는다.
  await c.env.DB.prepare(
    `INSERT INTO account_preferences
    (user_id,theme,accent,reminder_enabled,reminder_time,timezone,custom_reminder_configured,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
    ${body.initialize_theme ? "theme=COALESCE(account_preferences.theme,excluded.theme)" : keys.map((k) => `${k}=excluded.${k}`).join(",")},
    custom_reminder_configured=MAX(account_preferences.custom_reminder_configured,excluded.custom_reminder_configured),updated_at=excluded.updated_at`,
  )
    .bind(
      c.get("userId"),
      body.theme ?? body.initialize_theme ?? null,
      body.accent ?? null,
      body.reminder_enabled ? 1 : 0,
      body.reminder_time ?? "19:00",
      timezone,
      custom ? 1 : 0,
      Math.floor(Date.now() / 1000),
    )
    .run();
  return ok(
    c,
    await preferences(c.env.DB, c.get("userId"), c.get("learningTrack")),
  );
});
routes.get("/account/avatar", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT jpeg FROM account_avatars WHERE user_id=?",
  )
    .bind(c.get("userId"))
    .first<{ jpeg: ArrayBuffer }>();
  if (!row) return notFound(c);
  c.header("Content-Type", "image/jpeg");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Content-Disposition", 'inline; filename="avatar.jpg"');
  return c.body(new Uint8Array(row.jpeg));
});
routes.put("/account/avatar", async (c) => {
  if (c.req.header("Content-Type")?.split(";")[0] !== "image/jpeg")
    return badRequest(c, "Only a 256px JPEG is accepted");
  let bytes: Uint8Array;
  try {
    bytes = normalizeAvatar(await boundedAvatarBody(c.req.raw));
  } catch {
    return badRequest(
      c,
      "Invalid JPEG: use 256 x 256 pixels and at most 128 KiB",
    );
  }
  const updated = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO account_avatars(user_id,jpeg,updated_at) VALUES(?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET jpeg=excluded.jpeg,updated_at=excluded.updated_at`,
  )
    .bind(c.get("userId"), Array.from(bytes), updated)
    .run();
  return ok(c, { avatar_updated_at: updated });
});
routes.delete("/account/avatar", async (c) => {
  await c.env.DB.prepare("DELETE FROM account_avatars WHERE user_id=?")
    .bind(c.get("userId"))
    .run();
  return c.body(null, 204);
});
export const accountOA = new OpenAPIHono<AppEnv>();
const errors = {
  400: {
    description: "Invalid input",
    content: { "application/json": { schema: problemSchema } },
  },
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: problemSchema } },
  },
  409: {
    description: "Account changed",
    content: { "application/json": { schema: problemSchema } },
  },
};
mountLegacyRouteWithOpenApiDocs(accountOA, routes, [
  {
    method: "get",
    path: "/account/preferences",
    tags: ["Account"],
    responses: {
      200: {
        description: "Account preferences",
        content: { "application/json": { schema: dataResponseSchema } },
      },
      ...errors,
    },
  },
  {
    method: "put",
    path: "/account/preferences",
    tags: ["Account"],
    request: {
      body: { content: { "application/json": { schema: preferenceInput } } },
    },
    responses: {
      200: {
        description: "Saved preferences",
        content: { "application/json": { schema: dataResponseSchema } },
      },
      ...errors,
    },
  },
  {
    method: "get",
    path: "/account/avatar",
    tags: ["Account"],
    responses: {
      200: {
        description: "Private JPEG",
        content: {
          "image/jpeg": { schema: z.string().openapi({ format: "binary" }) },
        },
      },
      404: { description: "No uploaded avatar" },
      ...errors,
    },
  },
  {
    method: "put",
    path: "/account/avatar",
    tags: ["Account"],
    request: {
      body: {
        content: {
          "image/jpeg": { schema: z.string().openapi({ format: "binary" }) },
        },
      },
    },
    responses: {
      200: {
        description: "Avatar saved",
        content: { "application/json": { schema: dataResponseSchema } },
      },
      ...errors,
    },
  },
  {
    method: "delete",
    path: "/account/avatar",
    tags: ["Account"],
    responses: { 204: { description: "Uploaded avatar removed" }, ...errors },
  },
]);
