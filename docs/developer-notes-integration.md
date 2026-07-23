# WhackSmacker developer-notes integration contract

## Build and copy

From the pinned `whacksmacker-site` checkout, run:

```sh
npm run build:developer-notes
```

Copy the complete contents of `dist/developer-notes/` into the main frontend's deployed static-assets location at `/developer-notes/`. Do not copy the repository root, `scripts/`, `docs/`, `integration/`, `.github/`, Git metadata, or caches. The export is self-contained and contains the HTML pages, CSS, JavaScript, JSON, and SVG assets it needs.

## Routing and index files

The frontend must serve the bundle at the exact prefix `/developer-notes/`. `index.html` is the homepage for that prefix; `human-voice/index.html` is the homepage for `/developer-notes/human-voice/`. The bundle uses relative internal URLs intentionally, so it must be mounted as a directory, not flattened or rewritten.

No SPA fallback or Cloudflare Pages routing is required. A direct request for an existing HTML file must serve that file. For a missing developer-notes URL, serve `dist/developer-notes/404.html` with HTTP 404 when the frontend's static serving layer supports it. If that layer cannot select a 404 document, return its normal 404 response; do not rewrite the request to the developer-notes homepage.

## Caching

`marketing.css`, `preview.css`, `assets/progress.js`, `assets/terminal-preview.svg`, and `data/progress.json` may be cached as static assets. Because the current export does not fingerprint filenames, use revalidation or a short-to-moderate cache lifetime rather than `immutable` caching for these files. HTML files, including `404.html`, must not receive long-lived immutable caching.

## Security policy

The bundle has no inline scripts, styles, fonts, images, frames, or network API calls. Its only script is `assets/progress.js`; it fetches the same-origin `data/progress.json`. A compatible CSP is:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'
```

The page also links users to GitHub. Navigation links do not require GitHub in CSP `connect-src`; add an appropriate `navigate-to` policy only if the host application already uses one.

## Release pinning

Record the exact `whacksmacker-site` Git commit SHA used for every WhackSmacker release build in the main frontend's release metadata or build provenance. The release build should check out that SHA, run the command above, and package the resulting `dist/developer-notes/` directory. Updating developer notes is therefore an explicit pinned-source change, not an untracked fetch at build time.
