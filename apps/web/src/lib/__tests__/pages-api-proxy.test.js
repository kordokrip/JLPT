import { afterEach, describe, expect, it, vi } from "vitest";

import {
  onRequest,
  resolveApiOrigin,
} from "../../../functions/api/[[path]].js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Pages API proxy isolation", () => {
  it("uses the production Worker only on the production Pages hostname", () => {
    expect(
      resolveApiOrigin(new URL("https://nihongo-n3.pages.dev/api/v1/health")),
    ).toBe("https://nihongo-n3-api.kordokrip.workers.dev");
  });

  it("fails closed on a preview hostname without an explicit API origin", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest({
      request: new Request(
        "https://feature-topik.nihongo-n3.pages.dev/api/v1/tracks/topik-ko/status",
      ),
      env: {},
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: 503,
      title: "Preview API Not Configured",
    });
  });

  it("proxies preview requests only to the configured HTTPS Worker", async () => {
    const fetchMock = vi.fn(async (request) => {
      expect(request.url).toBe(
        "https://nihongo-n3-api-topik-preview.kordokrip.workers.dev/api/v1/health?probe=1",
      );
      expect(request.headers.get("x-forwarded-host")).toBe(
        "feature-topik.nihongo-n3.pages.dev",
      );
      return Response.json({ data: { status: "ok" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest({
      request: new Request(
        "https://feature-topik.nihongo-n3.pages.dev/api/v1/health?probe=1",
      ),
      env: {
        API_ORIGIN:
          "https://nihongo-n3-api-topik-preview.kordokrip.workers.dev/",
      },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects an insecure non-local configured origin", () => {
    expect(
      resolveApiOrigin(
        new URL("https://feature-topik.nihongo-n3.pages.dev/api/v1/health"),
        { API_ORIGIN: "http://example.com" },
      ),
    ).toBeNull();
  });
});
