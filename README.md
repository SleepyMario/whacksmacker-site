# WhackSmacker Site

This repository contains the static public preview website for `www.whacksmacker.com`.

It is not the full WhackSmacker frontend. It is a lightweight development preview site with project status, progress notes, roadmap notes, and experimental download warnings.

## Hosting

Intended hosting: Cloudflare Pages.

Suggested Cloudflare Pages settings:

- Build command: none
- Output directory: repository root
- Custom domain: `www.whacksmacker.com`

## Local Preview

From this repository:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

The progress page fetches `data/progress.json`, so preview it through a static server rather than opening `progress.html` directly from the filesystem.

## Editorial Updates

`editorial/website-update-rules.md` is the canonical website-update policy. Session-ending update preparation must review and summarize `editorial/checklists/update-review-checklist.md`, and `npm run validate:editorial` must pass before publication.

## Deployment Notes

1. Create or connect the GitHub repository for this site.
2. Connect that GitHub repository to Cloudflare Pages.
3. Use no build command.
4. Use the repository root as the output directory.
5. Configure `www.whacksmacker.com` as the custom domain.

## Deployment Source Check

This repo is a static Cloudflare Pages source. There is no `wrangler.toml`, build script, framework config, `dist/`, or `public/` output directory.

If `https://whacksmacker.com/` or `https://www.whacksmacker.com/` serves `Hello world`, the domain is not serving this repository root. Check Cloudflare for:

- a stale Worker route bound to `whacksmacker.com/*` or `www.whacksmacker.com/*`;
- a Pages project connected to the wrong Git repository or branch;
- a Pages build output directory that is not the repository root;
- DNS/custom-domain bindings pointing at an old Worker or Pages project.

Do not put secrets, binaries, release artifacts, or generated package files in this repository.
