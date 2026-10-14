// 강성호 2026-10-13: 중복 클릭·보류·실패·동의 후 재안내 방지. 저장된 학습 데이터는 변경하지 않는다.
import { beforeEach, expect, it, vi } from "vitest";
import {
  announceLoadedPwaRelease,
  usePwaUpdateStore as store,
} from "./pwa-update-store";
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  store.setState({
    available: false,
    open: false,
    applying: false,
    error: null,
    action: null,
  });
});
it("show and later never execute the update action", () => {
  const action = vi.fn();
  store.getState().show(action);
  store.getState().dismiss();
  expect(store.getState().open).toBe(false);
  expect(action).not.toHaveBeenCalled();
  store.getState().show(action);
  expect(store.getState().open).toBe(false);
});
it("executes explicit confirmation once despite duplicate clicks", async () => {
  let finish!: () => void;
  const action = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  store.getState().show(action);
  const first = store.getState().apply();
  await store.getState().apply();
  expect(action).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem("pwa-approved-reload")).toBe("1");
  finish();
  await first;
});
it("shows failure and permits retry without deleting study data", async () => {
  localStorage.setItem("study-pending", "preserved");
  const action = vi
    .fn()
    .mockRejectedValueOnce(new Error("active-learning"))
    .mockResolvedValueOnce(undefined);
  store.getState().show(action);
  await store.getState().apply();
  expect(store.getState().error).toBe("active-learning");
  expect(store.getState().applying).toBe(false);
  expect(sessionStorage.getItem("pwa-approved-reload")).toBeNull();
  expect(localStorage.getItem("study-pending")).toBe("preserved");
  await store.getState().apply();
  expect(action).toHaveBeenCalledTimes(2);
});
it("does not announce first install or repeat an accepted update", () => {
  announceLoadedPwaRelease("a", false);
  expect(store.getState().available).toBe(false);
  sessionStorage.setItem("pwa-approved-reload", "1");
  announceLoadedPwaRelease("b", true);
  expect(store.getState().available).toBe(false);
  expect(localStorage.getItem("pwa-seen-release")).toBe("b");
});
it("announces a changed loaded release once without reloading automatically", () => {
  localStorage.setItem("pwa-seen-release", "a");
  announceLoadedPwaRelease("b", true);
  expect(store.getState().open).toBe(true);
  store.getState().dismiss();
  announceLoadedPwaRelease("b", true);
  expect(store.getState().open).toBe(false);
});
