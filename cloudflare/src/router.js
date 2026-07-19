const CANONICAL_HOST = "www.whacksmacker.com";
const RETIRED_HOST = "alpha.whacksmacker.com";
const FORBIDDEN_UPSTREAM_HOSTS = new Set([CANONICAL_HOST, "whacksmacker.com", RETIRED_HOST]);
const EXACT_APPLICATION_PATHS = new Set([
  "/login",
  "/login.js",
  "/app",
  "/app.js",
  "/styles.css",
  "/ui-locale.js",
  "/landing.css",
  "/assets/whacksmacker-logo.png"
]);

export function isApplicationPath(pathname) {
  return EXACT_APPLICATION_PATHS.has(pathname) || pathname.startsWith("/api/");
}

export function parseUpstreamOrigin(value) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("WHACKSMACKER_APP_ORIGIN is not configured.");
  const origin = new URL(value);
  if (origin.protocol !== "https:") throw new Error("WHACKSMACKER_APP_ORIGIN must use HTTPS.");
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("WHACKSMACKER_APP_ORIGIN must be an origin without credentials, path, query, or fragment.");
  }
  if (FORBIDDEN_UPSTREAM_HOSTS.has(origin.hostname.toLowerCase())) {
    throw new Error("WHACKSMACKER_APP_ORIGIN must not recurse into a Pages or retired hostname.");
  }
  return origin;
}

function errorResponse(status, error) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

export async function proxyRequest(request, env, fetchImplementation = fetch) {
  const incomingUrl = new URL(request.url);
  if (!isApplicationPath(incomingUrl.pathname)) return errorResponse(404, "Not found.");

  let upstreamOrigin;
  try {
    upstreamOrigin = parseUpstreamOrigin(env?.WHACKSMACKER_APP_ORIGIN);
  } catch {
    return errorResponse(503, "WhackSmacker application origin is unavailable.");
  }

  const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, upstreamOrigin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", CANONICAL_HOST);
  headers.set("x-forwarded-proto", "https");
  const clientAddress = request.headers.get("cf-connecting-ip");
  if (clientAddress) headers.set("x-forwarded-for", clientAddress);
  else headers.delete("x-forwarded-for");

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    duplex: "half",
    redirect: "manual"
  });

  try {
    return await fetchImplementation(upstreamRequest);
  } catch {
    return errorResponse(502, "WhackSmacker application origin did not respond.");
  }
}

export default {
  fetch(request, env) {
    return proxyRequest(request, env);
  }
};
