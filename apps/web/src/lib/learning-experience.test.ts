import { afterEach, expect, it, vi } from "vitest";
import { api } from "./api";
import { learningApi } from "./learning-experience";
import { useSettingsStore } from "../stores/settings-store";

const initialTrack = useSettingsStore.getState().learningTrack;
afterEach(() => {
  vi.restoreAllMocks();
  useSettingsStore.setState({ learningTrack: initialTrack });
});
it.each(["jlpt-ja", "topik-ko"] as const)(
  "binds every new learning read/write to the device's %s scope",
  async (track) => {
    useSettingsStore.setState({ learningTrack: track });
    const methods = ["get", "post", "put", "patch"] as const;
    const spies = methods.map((method) =>
      vi.spyOn(api, method).mockResolvedValue({ ok: true, data: {} }),
    );
    await learningApi.profile();
    await learningApi.saveProfile({
      target_level: track === "jlpt-ja" ? "N3" : "3",
      instruction_language: "ja",
      daily_minutes: 20,
      timezone: "Asia/Tokyo",
    });
    await learningApi.current();
    await learningApi.start("request");
    await learningApi.session("session");
    await learningApi.status("session", "paused");
    await learningApi.reveal("session", "step");
    await learningApi.submit("session", "step", {
      request_id: "request",
      active_ms: 0,
    });
    await learningApi.records("30d");
    await learningApi.notes();
    await learningApi.saveNote({
      scope: "day",
      ref: "2026-09-06",
      text: "draft",
      revision: 0,
    });
    const paths = spies.flatMap((spy) => spy.mock.calls.map(([path]) => path));
    expect(paths).toHaveLength(11);
    for (const path of paths) {
      expect(
        new URL(path, "https://example.invalid").searchParams.get(
          "expected_track",
        ),
      ).toBe(track);
    }
    const records = paths.find((path) => path.startsWith("/learning/records"))!;
    expect(
      new URL(records, "https://example.invalid").searchParams.get("window"),
    ).toBe("30d");
  },
);
