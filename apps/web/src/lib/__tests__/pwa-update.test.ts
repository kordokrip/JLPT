// 강성호 2026-10-13: 자동 새로고침 대신 대기·사용자 동의·첫 설치 구분을 검증한다.
import { describe, expect, it, vi } from "vitest";
import {
  isPwaUpdateSafePath,
  registerPwaUpdates,
  mayReloadPwa,
} from "../pwa-update";
function fixture(controlled = true, waiting = false) {
  const worker = Object.assign(new EventTarget(), {
    state: "installed",
  }) as unknown as ServiceWorker;
  const registration = Object.assign(new EventTarget(), {
    waiting: waiting ? worker : null,
    installing: null,
  });
  const container = Object.assign(new EventTarget(), {
    controller: controlled ? worker : null,
    register: vi.fn().mockResolvedValue(registration),
  });
  return {
    worker,
    registration,
    container: container as unknown as ServiceWorkerContainer,
  };
}
describe("explicit PWA update lifecycle", () => {
  it("rechecks mutations and route immediately before reloading", () => {
    expect(mayReloadPwa("/", 1)).toBe(false);
    expect(mayReloadPwa("/study/pending", 0)).toBe(false);
    expect(mayReloadPwa("/welcome", 0)).toBe(true);
  });
  it.each(["/", "/welcome", "/track/topik-ko"])(
    "allows confirmation only at %s",
    (path) => expect(isPwaUpdateSafePath(path)).toBe(true),
  );
  it.each([
    "/study/saved",
    "/quiz",
    "/settings",
    "/login",
    "/track/topik-ko/review",
  ])("protects %s", (path) => expect(isPwaUpdateSafePath(path)).toBe(false));
  it("announces a waiting update without activating or reloading it", async () => {
    const f = fixture(true, true),
      waiting = vi.fn(),
      activated = vi.fn();
    await registerPwaUpdates(f.container, "/sw.js", "classic", {
      waiting,
      activated,
    });
    expect(waiting).toHaveBeenCalledWith(f.worker);
    expect(activated).not.toHaveBeenCalled();
    expect(f.container.register).toHaveBeenCalledWith("/sw.js", {
      type: "classic",
      updateViaCache: "none",
    });
  });
  it("ignores initial installation but observes a subsequent replacement", async () => {
    const f = fixture(false),
      waiting = vi.fn(),
      activated = vi.fn();
    await registerPwaUpdates(f.container, "/sw.js", "classic", {
      waiting,
      activated,
    });
    Object.assign(f.container, { controller: f.worker });
    f.container.dispatchEvent(new Event("controllerchange"));
    expect(activated).not.toHaveBeenCalled();
    f.container.dispatchEvent(new Event("controllerchange"));
    expect(activated).toHaveBeenCalledTimes(1);
  });
  it("announces an installed update only once", async () => {
    const f = fixture(),
      waiting = vi.fn();
    await registerPwaUpdates(f.container, "/sw.js", "classic", {
      waiting,
      activated: vi.fn(),
    });
    Object.assign(f.registration, { installing: f.worker });
    f.registration.dispatchEvent(new Event("updatefound"));
    f.worker.dispatchEvent(new Event("statechange"));
    f.worker.dispatchEvent(new Event("statechange"));
    expect(waiting).toHaveBeenCalledTimes(1);
  });
});
