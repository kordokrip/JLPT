// 강성호 2026-10-13: 실제 production 빌드와 브라우저 SW를 검사한다. API는 익명 fixture이며 가청/운영 검증은 아니다.
import { test, expect, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
let server: Server, origin: string, current: string;
const v1 = resolve(process.env.PWA_TEST_V1!),
  v2 = resolve(process.env.PWA_TEST_V2!);
const first = "1".repeat(40),
  second = "2".repeat(40);
test.beforeEach(async () => {
  current = v1;
  server = createServer(async (req, res) => {
    const path = new URL(req.url!, "http://localhost").pathname;
    if (path.startsWith("/api/")) {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(
        JSON.stringify({
          data: path.endsWith("/auth/config")
            ? { google_enabled: false, auth_mode: "local" }
            : { authenticated: false, user: null },
        }),
      );
      return;
    }
    let file = resolve(current, "." + decodeURIComponent(path));
    if (!file.startsWith(current + sep) && file !== current) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!extname(path)) file = resolve(current, "index.html");
    try {
      const bytes = await readFile(file),
        type =
          (
            {
              ".js": "text/javascript",
              ".html": "text/html",
              ".css": "text/css",
              ".json": "application/json",
              ".webmanifest": "application/manifest+json",
              ".png": "image/png",
              ".svg": "image/svg+xml",
            } as Record<string, string>
          )[extname(file)] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
test.afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
async function installed(page: Page, lang = "ko") {
  await page.addInitScript((language) => {
    if (!localStorage.getItem("nihongo-n3-settings"))
      localStorage.setItem(
        "nihongo-n3-settings",
        JSON.stringify({ state: { language }, version: 0 }),
      );
  }, lang);
  await page.goto(origin + "/welcome");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("pwa-seen-release")))
    .toBe(first);
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function update(page: Page) {
  current = v2;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect(page.getByRole("dialog")).toBeVisible();
}
for (const language of ["ko", "ja"])
  test(`${language}: waiting update, postpone, keyboard and explicit reload preserve local data`, async ({
    page,
  }, info) => {
    await installed(page, language);
    await page.evaluate(() =>
      localStorage.setItem("pwa-test-pending-note", "preserved"),
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("nihongo-n3");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result,
              transaction = database.transaction("sync_queue", "readwrite");
            transaction.objectStore("sync_queue").put({
              id: 9898,
              user_id: "pwa-synthetic-user",
              op_id: "pwa-qa-pending-op",
              type: "daily_log",
              payload: '{"synthetic":true}',
              occurred_at: "2026-10-13T00:00:00Z",
              status: "pending",
              retries: 0,
            });
            transaction.oncomplete = () => {
              database.close();
              resolve();
            };
            transaction.onerror = () => reject(transaction.error);
          };
        }),
    );
    await update(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("새 버전 업데이트")).toBeVisible();
    await expect(dialog.getByText("新しいバージョンに更新")).toBeVisible();
    expect(await dialog.locator("h2 span").first().getAttribute("lang")).toBe(
      language,
    );
    await expect(dialog.getByRole("button", { name: /나중에/ })).toBeFocused();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({ path: info.outputPath(`update-${language}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("pwa-seen-release")),
    ).toBe(first);
    await page.getByRole("button", { name: /새 버전 업데이트/ }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /나중에/ }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: /새 버전 업데이트/ }).click();
    const reloaded = page.waitForEvent(
      "framenavigated",
      (frame) => frame === page.mainFrame(),
    );
    await dialog.getByRole("button", { name: /업데이트하고 새로고침/ }).click();
    await reloaded;
    await page.waitForFunction(
      (release) => localStorage.getItem("pwa-seen-release") === release,
      second,
    );
    await expect(dialog).not.toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("pwa-test-pending-note")),
    ).toBe("preserved");
    const queued = await page.evaluate(
      () =>
        new Promise<any>((resolve, reject) => {
          const request = indexedDB.open("nihongo-n3");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result,
              row = database
                .transaction("sync_queue", "readonly")
                .objectStore("sync_queue")
                .get(9898);
            row.onsuccess = () => {
              database.close();
              resolve(row.result);
            };
            row.onerror = () => reject(row.error);
          };
        }),
    );
    expect(queued).toEqual({
      id: 9898,
      user_id: "pwa-synthetic-user",
      op_id: "pwa-qa-pending-op",
      type: "daily_log",
      payload: '{"synthetic":true}',
      occurred_at: "2026-10-13T00:00:00Z",
      status: "pending",
      retries: 0,
    });
  });
for (const otherPath of ["/login", "/welcome"])
  test(`another app tab at ${otherPath} blocks activation, then permits retry`, async ({
    page,
    context,
  }) => {
    await installed(page);
    const blocker = await context.newPage();
    await blocker.goto(origin + otherPath);
    await expect(blocker).toHaveURL(origin + otherPath);
    await update(page);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /업데이트하고 새로고침/ })
      .click();
    await expect(page.getByRole("alert")).toContainText("다른 앱 탭");
    expect(
      await page.evaluate(() => localStorage.getItem("pwa-seen-release")),
    ).toBe(first);
    await blocker.close();
    const reloaded = page.waitForEvent(
      "framenavigated",
      (frame) => frame === page.mainFrame(),
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /업데이트하고 새로고침/ })
      .click();
    await reloaded;
    await page.waitForFunction(
      (release) => localStorage.getItem("pwa-seen-release") === release,
      second,
    );
  });

test("route change during activation defers reload until a safe screen", async ({
  page,
}) => {
  await page.addInitScript(() =>
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (localStorage.getItem("pwa-test-activation-race") === "1") {
        history.pushState({}, "", "/login");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }),
  );
  await installed(page);
  await update(page);
  const documentOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() =>
    localStorage.setItem("pwa-test-activation-race", "1"),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /업데이트하고 새로고침/ })
    .click();
  await expect(page).toHaveURL(origin + "/login");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(
    documentOrigin,
  );
  expect(
    await page.evaluate(() => localStorage.getItem("pwa-seen-release")),
  ).toBe(first);
});

const priorBuilds = [
  ...(process.env.PWA_TEST_LEGACY ? [{
    kind: "legacy automatic",
    path: process.env.PWA_TEST_LEGACY,
    release: null,
  }] : []),
  ...(process.env.PWA_TEST_PREVIOUS ? [{
    kind: "previous managed production",
    path: process.env.PWA_TEST_PREVIOUS,
    release: process.env.PWA_TEST_PREVIOUS_RELEASE!,
  }] : []),
];
if (process.env.PWA_TEST_PREVIOUS && !/^[a-f0-9]{40}$/.test(process.env.PWA_TEST_PREVIOUS_RELEASE ?? ""))
  throw new Error("Previous managed build requires its exact source release SHA");
for (const prior of priorBuilds)
  test(`${prior.kind} app requires closing all tabs, then shows the bilingual announcement`, async ({
    page,
    context,
    browserName,
  }, info) => {
    type Version = { versionId: string; status: string; scriptURL: string };
    const protocolEvents: { versions: Version[] }[] = [];
    const versions = new Map<string, Version>();
    const observer =
      browserName === "chromium" ? await context.newPage() : null;
    const protocol = observer ? await context.newCDPSession(observer) : null;
    if (protocol) {
      protocol.on("ServiceWorker.workerVersionUpdated", (event) => {
        protocolEvents.push(event);
        for (const version of event.versions)
          versions.set(version.versionId, version);
      });
      await protocol.send("ServiceWorker.enable");
    }
    current = resolve(prior.path);
    await page.goto(origin + "/welcome");
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("pwa-seen-release"))).toBe(prior.release);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const documentOrigin = await page.evaluate(() => performance.timeOrigin);
    let oldVersion: string | undefined;
    if (protocol) {
      await expect
        .poll(() =>
          [...versions.values()].some(
            (version) => version.status === "activated",
          ),
        )
        .toBe(true);
      oldVersion = [...versions.values()].find(
        (version) => version.status === "activated",
      )!.versionId;
    }
    await page.evaluate(() =>
      localStorage.setItem("pwa-test-pending-note", "preserved"),
    );
    current = v2;
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update();
    });
    await page.waitForFunction(
      async () =>
        (await navigator.serviceWorker.ready).waiting?.state === "installed",
    );
    let newVersion: string | undefined;
    if (protocol) {
      await expect
        .poll(() =>
          [...versions.values()].some(
            (version) =>
              version.versionId !== oldVersion &&
              version.status === "installed",
          ),
        )
        .toBe(true);
      newVersion = [...versions.values()].find(
        (version) =>
          version.versionId !== oldVersion && version.status === "installed",
      )!.versionId;
    }
    expect(
      await page.evaluate(() => localStorage.getItem("pwa-seen-release")),
    ).toBe(prior.release);
    // A managed client must offer the waiting update without activating/reloading
    // it. Postponing then closing all app clients exercises natural activation.
    if (prior.release !== null) {
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("새 버전 업데이트")).toBeVisible();
      await expect(dialog.getByText("新しいバージョンに更新")).toBeVisible();
      await dialog.getByRole("button", { name: /나중에/ }).click();
      await expect(dialog).not.toBeVisible();
    }
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentOrigin);
    expect(await page.evaluate(() => localStorage.getItem("pwa-seen-release"))).toBe(prior.release);
    const workerHandles = context.serviceWorkers();
    await info.attach("legacy-protocol-before-close", {
      contentType: "application/json",
      body: JSON.stringify(protocolEvents),
    });
    await page.close();
    if (browserName === "chromium")
      await info.attach("legacy-closed-clients", {
        contentType: "application/json",
        body: JSON.stringify(
          await Promise.all(
            workerHandles.map(async (worker) => {
              try {
                return await worker.evaluate(async () => ({
                  clients: (
                    await self.clients.matchAll({
                      type: "window",
                      includeUncontrolled: true,
                    })
                  ).map((client) => client.url),
                  active: self.registration.active?.state,
                  waiting: self.registration.waiting?.state,
                }));
              } catch {
                return { closed: true };
              }
            }),
          ),
        ),
      });
    // 강성호 2026-10-13: waiting 객체 존재만으로 설치 완료를 판정하지 않는다.
    // 위 installed와 정확한 새 versionId의 활성화를 확인해 구 active를 오인하지 않는다.
    if (browserName === "chromium")
      await expect
        .poll(async () => {
          return versions.get(newVersion!)?.status === "activated";
        })
        .toBe(true);
    const reopened = await context.newPage();
    await reopened.goto(origin + "/welcome");
    await info.attach("legacy-protocol-after-reopen", {
      contentType: "application/json",
      body: JSON.stringify(protocolEvents),
    });
    await info.attach("legacy-reopen-state", {
      contentType: "application/json",
      body: JSON.stringify(
        await reopened.evaluate(async () => {
          const registration =
            await navigator.serviceWorker.getRegistration("/");
          return {
            seen: localStorage.getItem("pwa-seen-release"),
            controller: navigator.serviceWorker.controller?.state,
            active: registration?.active?.state,
            waiting: registration?.waiting?.state,
            scripts: [...document.scripts].map((s) => s.src),
          };
        }),
      ),
    });
    await info.attach("legacy-cache-state", {
      contentType: "application/json",
      body: JSON.stringify({
        network: await (
          await reopened.request.get(origin + "/index.html")
        ).text(),
        cache: await reopened.evaluate(async () => {
          const rows = [];
          for (const name of await caches.keys()) {
            const cache = await caches.open(name);
            for (const key of await cache.keys())
              if (new URL(key.url).pathname === "/index.html")
                rows.push({
                  name,
                  url: key.url,
                  body: await (await cache.match(key))!.text(),
                });
          }
          return rows;
        }),
      }),
    });
    await expect(reopened.getByRole("dialog")).toBeVisible();
    await expect(
      reopened.getByRole("dialog").getByText("새 버전 업데이트"),
    ).toBeVisible();
    await expect(
      reopened.getByRole("dialog").getByText("新しいバージョンに更新"),
    ).toBeVisible();
    expect(
      await reopened.evaluate(() =>
        localStorage.getItem("pwa-test-pending-note"),
      ),
    ).toBe("preserved");
    expect(
      await reopened.evaluate(() => localStorage.getItem("pwa-seen-release")),
    ).toBe(second);
  });
