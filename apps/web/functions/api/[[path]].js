const PRODUCTION_API_ORIGIN = "https://nihongo-n3-api.kordokrip.workers.dev";
const PRODUCTION_PAGES_HOST = "nihongo-n3.pages.dev";

export function resolveApiOrigin(sourceUrl, env = {}) {
  const configured =
    typeof env.API_ORIGIN === "string" ? env.API_ORIGIN.trim() : "";
  if (configured) {
    try {
      const url = new URL(configured);
      const local =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol !== "https:" && !local) return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  return sourceUrl.hostname === PRODUCTION_PAGES_HOST
    ? PRODUCTION_API_ORIGIN
    : null;
}

function previewApiUnavailable() {
  return Response.json(
    {
      type: "https://nihongo-n3.example.com/errors/preview-api-not-configured",
      title: "Preview API Not Configured",
      status: 503,
      detail: "Preview deployment is isolated from the production API.",
    },
    {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "retry-after": "60",
      },
    },
  );
}

export async function onRequest({ request, env = {} }) {
  const sourceUrl = new URL(request.url);
  // 원래 브라우저 Origin을 확인하기 전에 프록시 Origin으로 덮어쓰지 않는다.
  const method = request.method.toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const origin = request.headers.get("Origin");
    const site = request.headers.get("Sec-Fetch-Site");
    if ((origin && origin !== sourceUrl.origin)
      || (!origin && site && site !== "same-origin" && site !== "none")) {
      return Response.json({ status: 403, title: "Forbidden", detail: "Untrusted request origin" },
        { status: 403, headers: { "cache-control": "no-store" } });
    }
  }
  const apiOrigin = resolveApiOrigin(sourceUrl, env);
  if (!apiOrigin) return previewApiUnavailable();

  const targetUrl = new URL(sourceUrl.pathname + sourceUrl.search, apiOrigin);
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.set("Origin", sourceUrl.origin);
  headers.set("x-forwarded-host", sourceUrl.host);
  headers.set("x-forwarded-proto", sourceUrl.protocol.replace(":", ""));

  const upstreamRequest = new Request(targetUrl, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  const response = await fetch(upstreamRequest);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("access-control-allow-origin");
  responseHeaders.delete("access-control-allow-credentials");
  const vary = responseHeaders.get("vary");
  if (vary) {
    const forwardedVary = [...new Set(
      vary.split(",").map((value) => value.trim()).filter((value) => value && value.toLowerCase() !== "origin"),
    )];
    if (forwardedVary.length > 0) responseHeaders.set("vary", forwardedVary.join(", "));
    else responseHeaders.delete("vary");
  }
  if (sourceUrl.pathname.startsWith("/api/v1/auth/")) {
    responseHeaders.set("cache-control", "no-store");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
