import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isApplicationPath, parseUpstreamOrigin, proxyRequest } from "../cloudflare/src/router.js";

const appOrigin = "https://node-origin.whacksmacker.com";

test("Worker configuration claims only the explicit application paths", async () => {
  const config = JSON.parse(await readFile(new URL("../cloudflare/wrangler.jsonc", import.meta.url), "utf8"));
  const patterns = config.routes.map(route => route.pattern);
  assert.deepEqual(patterns, [
    "www.whacksmacker.com/login*",
    "www.whacksmacker.com/app*",
    "www.whacksmacker.com/api/*",
    "www.whacksmacker.com/app.js*",
    "www.whacksmacker.com/login.js*",
    "www.whacksmacker.com/styles.css*",
    "www.whacksmacker.com/ui-locale.js*",
    "www.whacksmacker.com/landing.css*",
    "www.whacksmacker.com/assets/whacksmacker-logo.png*"
  ]);
  assert.equal(config.workers_dev, false);
  assert.ok(!patterns.includes("www.whacksmacker.com/*"));
  assert.ok(!patterns.includes("www.whacksmacker.com/"));
  assert.ok(!patterns.some(pattern => pattern.endsWith("/assets/*")));
});

test("application path selection excludes Pages-owned paths", () => {
  for (const path of ["/login", "/login.js", "/app", "/app.js", "/api/health", "/styles.css", "/ui-locale.js", "/landing.css", "/assets/whacksmacker-logo.png"]) {
    assert.equal(isApplicationPath(path), true, path);
  }
  for (const path of ["/", "/marketing.css", "/preview.css", "/assets/screenshots/cli.webp", "/roadmap.html"]) {
    assert.equal(isApplicationPath(path), false, path);
  }
});

test("GET proxy preserves query, cookies, Origin, response status, Location, and Set-Cookie", async () => {
  let proxied;
  const response = await proxyRequest(new Request("https://www.whacksmacker.com/app?chapter=10", {
    headers: {
      cookie: "wsm_session=session-token",
      origin: "https://www.whacksmacker.com",
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.99"
    }
  }), { WHACKSMACKER_APP_ORIGIN: appOrigin }, async request => {
    proxied = request;
    return new Response(null, {
      status: 302,
      headers: {
        location: "/login?returnTo=%2Fapp",
        "set-cookie": "wsm_session=next; Path=/; HttpOnly; Secure; SameSite=Strict",
        "cache-control": "no-store"
      }
    });
  });

  assert.equal(proxied.url, `${appOrigin}/app?chapter=10`);
  assert.equal(proxied.method, "GET");
  assert.equal(proxied.headers.get("cookie"), "wsm_session=session-token");
  assert.equal(proxied.headers.get("origin"), "https://www.whacksmacker.com");
  assert.equal(proxied.headers.get("x-forwarded-host"), "www.whacksmacker.com");
  assert.equal(proxied.headers.get("x-forwarded-proto"), "https");
  assert.equal(proxied.headers.get("x-forwarded-for"), "203.0.113.10");
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/login?returnTo=%2Fapp");
  assert.equal(response.headers.get("set-cookie"), "wsm_session=next; Path=/; HttpOnly; Secure; SameSite=Strict");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("POST proxy preserves method, content type, body, and API response content type", async () => {
  let body;
  let contentType;
  const response = await proxyRequest(new Request("https://www.whacksmacker.com/api/login?source=marketing", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.whacksmacker.com" },
    body: JSON.stringify({ username: "learner", password: "not-a-real-secret" })
  }), { WHACKSMACKER_APP_ORIGIN: appOrigin }, async request => {
    body = await request.text();
    contentType = request.headers.get("content-type");
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  });

  assert.equal(contentType, "application/json");
  assert.deepEqual(JSON.parse(body), { username: "learner", password: "not-a-real-secret" });
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("router refuses recursive, Pages, retired, malformed, and missing upstreams", async () => {
  for (const origin of ["https://www.whacksmacker.com", "https://whacksmacker.com", "https://alpha.whacksmacker.com", "http://node-origin.whacksmacker.com", "https://node-origin.whacksmacker.com/path"]) {
    assert.throws(() => parseUpstreamOrigin(origin));
    const response = await proxyRequest(new Request("https://www.whacksmacker.com/login"), { WHACKSMACKER_APP_ORIGIN: origin }, () => {
      throw new Error("recursive upstream must not be fetched");
    });
    assert.equal(response.status, 503);
  }
  assert.throws(() => parseUpstreamOrigin(undefined));
});

test("unrelated paths are not proxied even if a route is attached accidentally", async () => {
  const response = await proxyRequest(new Request("https://www.whacksmacker.com/roadmap.html"), { WHACKSMACKER_APP_ORIGIN: appOrigin }, () => {
    throw new Error("Pages-owned path must not be fetched");
  });
  assert.equal(response.status, 404);
});
