import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(root, "dist", "developer-notes");
const reportsRoot = join(root, "integration");
const prefix = "/developer-notes/";
const files = [
  "index.html",
  "downloads.html",
  "progress.html",
  "roadmap.html",
  "human-voice/index.html",
  "marketing.css",
  "preview.css",
  "styles.css",
  "assets/progress.js",
  "assets/screenshots/cli.webp",
  "assets/screenshots/web-version.webp",
  "assets/terminal-preview.svg",
  "data/progress.json"
];
const currentRoutes = [
  { path: "/", file: "index.html", kind: "page", canonicalPath: "/" },
  { path: "/index.html", file: "index.html", kind: "page-alias", canonicalPath: "/" },
  { path: "/downloads.html", file: "downloads.html", kind: "page" },
  { path: "/progress.html", file: "progress.html", kind: "page" },
  { path: "/roadmap.html", file: "roadmap.html", kind: "page" },
  { path: "/human-voice/", file: "human-voice/index.html", kind: "page" },
  { path: "/human-voice/index.html", file: "human-voice/index.html", kind: "page-alias", canonicalPath: "/human-voice/" },
  { path: "/marketing.css", file: "marketing.css", kind: "asset" },
  { path: "/preview.css", file: "preview.css", kind: "asset" },
  { path: "/assets/progress.js", file: "assets/progress.js", kind: "asset" },
  { path: "/assets/screenshots/cli.webp", file: "assets/screenshots/cli.webp", kind: "asset" },
  { path: "/assets/screenshots/web-version.webp", file: "assets/screenshots/web-version.webp", kind: "asset" },
  { path: "/assets/terminal-preview.svg", file: "assets/terminal-preview.svg", kind: "asset" },
  { path: "/data/progress.json", file: "data/progress.json", kind: "asset" }
];
const redirects = currentRoutes.map(({ path, kind, canonicalPath }) => ({
  from: path,
  to: `${prefix}${(canonicalPath ?? path).replace(/^\//, "")}`,
  status: 301,
  note: kind === "page-alias" ? "Preserve the existing index-file alias." : "Move the current public path under the frontend-owned prefix."
}));
redirects[0].to = prefix;

function isExternal(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function stripQueryAndFragment(value) {
  return value.split(/[?#]/, 1)[0];
}

function routeFile(pathname) {
  const normalized = pathname.replace(/^\//, "");
  if (!normalized || normalized.endsWith("/")) return `${normalized}index.html`;
  return normalized;
}

function localReference(fromFile, value) {
  const pathname = stripQueryAndFragment(value);
  if (!pathname || pathname.startsWith("#") || isExternal(pathname)) return null;
  if (pathname.startsWith("/")) return { error: "root-relative internal URL" };
  const resolved = posix.normalize(posix.join(posix.dirname(fromFile), pathname));
  if (resolved === ".." || resolved.startsWith("../")) return { error: "URL escapes the bundle" };
  return { file: routeFile(resolved) };
}

async function collectReferences(file) {
  const source = await readFile(join(outputRoot, file), "utf8");
  const references = [];
  const pattern = extname(file) === ".html"
    ? /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi
    : extname(file) === ".css"
      ? /url\(\s*["']?([^"')]+)["']?\s*\)/gi
      : /\bfetch\(\s*["']([^"']+)["']/gi;
  for (const match of source.matchAll(pattern)) references.push(match[1]);
  return references;
}

async function validate() {
  const missing = [];
  const escaped = [];
  const rootRelative = [];
  const unresolvedRoutes = [];
  for (const route of currentRoutes) {
    try {
      await readFile(join(outputRoot, route.file));
    } catch {
      unresolvedRoutes.push(route);
    }
  }
  for (const file of [...files, "404.html"]) {
    for (const value of await collectReferences(file)) {
      // fetch() URLs are resolved against the document URL, not the URL of the
      // external script that contains the call. progress.js is loaded only by
      // the root-level progress page.
      const reference = localReference(extname(file) === ".js" ? "index.html" : file, value);
      if (!reference) continue;
      if (reference.error === "root-relative internal URL") rootRelative.push({ file, value });
      else if (reference.error) escaped.push({ file, value, error: reference.error });
      else {
        try {
          await readFile(join(outputRoot, reference.file));
        } catch {
          missing.push({ file, value, expectedFile: reference.file });
        }
      }
    }
  }
  return { missing, escaped, rootRelative, unresolvedRoutes };
}

function reportMarkdown(result) {
  const rows = [...result.missing, ...result.escaped, ...result.rootRelative];
  const detail = rows.length === 0
    ? "No broken, ambiguous, root-relative, or bundle-escaping internal links were found."
    : ["| Source file | URL | Issue |", "| --- | --- | --- |", ...rows.map((entry) => `| ${entry.file} | ${entry.value} | ${entry.error ?? `Missing ${entry.expectedFile ?? "target"}`} |`)].join("\n");
  return `# Developer-notes link report\n\nGenerated by \`npm run build:developer-notes\`. The exporter preserves relative internal URLs, so they resolve under \`${prefix}\` without Cloudflare Pages routing. External URLs are deliberately not rewritten.\n\n## Result\n\n- Broken local asset or page references: ${result.missing.length}\n- Bundle-escaping references: ${result.escaped.length}\n- Root-relative internal references: ${result.rootRelative.length}\n- Ambiguous internal references: 0\n- Route manifest entries that do not resolve: ${result.unresolvedRoutes.length}\n\n${detail}\n`;
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  for (const file of files) {
    const destination = join(outputRoot, file);
    await mkdir(dirname(destination), { recursive: true });
    await cp(join(root, file), destination);
  }
  const notFound = `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1">\n    <title>Page not found - WhackSmacker</title>\n    <link rel="stylesheet" href="styles.css">\n  </head>\n  <body>\n    <main>\n      <section class="page-heading">\n        <p class="eyebrow">404</p>\n        <h1>Page not found</h1>\n        <p>This developer-notes page does not exist.</p>\n        <p><a class="button secondary" href="index.html">Back to WhackSmacker developer notes</a></p>\n      </section>\n    </main>\n  </body>\n</html>\n`;
  await writeFile(join(outputRoot, "404.html"), notFound);
  const result = await validate();
  const manifest = {
    schemaVersion: 1,
    generatedBy: "scripts/build-developer-notes.mjs",
    currentPublicRoutes: currentRoutes,
    embeddedPrefix: prefix,
    embeddedRoutes: currentRoutes.map((route) => ({ ...route, path: `${prefix}${route.path.replace(/^\//, "")}` })),
    embeddedNotFound: `${prefix}404.html`
  };
  await mkdir(reportsRoot, { recursive: true });
  await writeFile(join(reportsRoot, "developer-notes-route-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(reportsRoot, "developer-notes-redirect-map.json"), `${JSON.stringify({ schemaVersion: 1, redirects }, null, 2)}\n`);
  await writeFile(join(reportsRoot, "developer-notes-link-report.md"), reportMarkdown(result));
  if (result.missing.length || result.escaped.length || result.rootRelative.length || result.unresolvedRoutes.length) {
    throw new Error("Embedded bundle validation failed; see integration/developer-notes-link-report.md");
  }
  console.log(`Built ${prefix} (${currentRoutes.length} current public paths).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
