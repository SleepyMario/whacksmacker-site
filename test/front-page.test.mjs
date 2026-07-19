import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const [originalStyles, marketingStyles] = await Promise.all([
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../marketing.css", import.meta.url), "utf8")
]);
const webOrigin = "https://www.whacksmacker.com";
const publicPages = await Promise.all([
  "../index.html",
  "../roadmap.html",
  "../progress.html",
  "../downloads.html",
  "../human-voice/index.html"
].map(async path => [path, await readFile(new URL(path, import.meta.url), "utf8")]));

test("front-page authentication buttons use the visible login flow", () => {
  assert.match(html, new RegExp(`href="${webOrigin}/login"[^>]*>Log in`));
  assert.equal((html.match(/href="https:\/\/www\.whacksmacker\.com\/login\?returnTo=%2Fapp"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /href="\/(?:login|app)/);
});

test("every public-site login CTA targets the canonical web GUI origin", () => {
  for (const [path, page] of publicPages) {
    assert.match(page, /href="https:\/\/www\.whacksmacker\.com\/login"[^>]*>Log in</, path);
  }
});

test("marketing pages avoid the Node-only stylesheet route without visual changes", () => {
  assert.equal(marketingStyles, originalStyles);
  for (const [path, page] of publicPages) {
    assert.doesNotMatch(page, /href="(?:\.\.\/)?styles\.css"/, path);
    assert.match(page, /href="(?:\.\.\/)?marketing\.css"/, path);
  }
});

test("front-page previews retain the approved CLI and GUI contents", () => {
  for (const content of [
    "WhackSmacker 1.0.0",
    "5) Custom Modules",
    "Streak: 12 | Reviews: 43 | Time: 00:08:21",
    "Spanish Core",
    "el libro",
    "&lt; 1 min",
    "&lt; 6 min",
    "&lt; 1 day"
  ]) assert.ok(html.includes(content), `missing preview content: ${content}`);
});
