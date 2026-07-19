# WhackSmacker application path router

The marketing site remains on Cloudflare Pages at `https://www.whacksmacker.com/`.
The Worker in this directory owns only the Node application's paths on that
hostname and proxies them to a distinct origin.

## Upstream status

No non-retired external Node origin existed when this router was prepared. The
Cloudflare account had no Tunnels, and the production Compose file published
port 8787 only on loopback or a configured private address. A remotely managed
Tunnel named `whacksmacker-node-origin` has therefore been created. It is not a
working upstream until its connector and published application are configured
on the Node deployment host.

Complete these steps in Cloudflare and on the deployment host:

1. In Cloudflare **Networking > Tunnels**, open `whacksmacker-node-origin`.
2. Install its connector on the Node deployment host. Keep the rotated token in
   a protected token file or service environment rather than a process command
   line, and never save it in this repository.
3. Add the published application `node-origin.whacksmacker.com` with service URL
   `http://127.0.0.1:8787`.
4. Apply the non-secret Node settings from
   `tunnel/node-production.env.example` to the protected production environment
   file, configure the production `DATABASE_URL`, and restart the Compose `app`
   service. Do not expose the filesystem-backed preview mode.
5. Verify the origin health endpoint returns the WhackSmacker JSON health
   object, `/login` contains `id="login-form"`, and a cookie-free `/app` request
   returns `302 Location: /login?returnTo=%2Fapp`. Do not proceed if any check
   fails, if it serves Pages content, or if it redirects to `www`.

The planned upstream is configured as the non-secret Wrangler variable
`WHACKSMACKER_APP_ORIGIN`. It is deliberately rejected at runtime if it points
to `www.whacksmacker.com`, the Pages apex, or the retired alpha hostname.

## Worker routes

`wrangler.jsonc` declares only these HTTPS routes:

- `www.whacksmacker.com/login*`
- `www.whacksmacker.com/app*`
- `www.whacksmacker.com/api/*`
- `www.whacksmacker.com/app.js*`
- `www.whacksmacker.com/login.js*`
- `www.whacksmacker.com/styles.css*`
- `www.whacksmacker.com/ui-locale.js*`
- `www.whacksmacker.com/landing.css*`
- `www.whacksmacker.com/assets/whacksmacker-logo.png*`

The Worker is not a Custom Domain and does not claim `/`, `marketing.css`,
`preview.css`, or the Pages `/assets/*` namespace. The marketing pages use
`marketing.css` so the Node-only `/styles.css` route cannot change the approved
site design.

## Validation and deployment

From the repository root:

```sh
npm test
npm run cloudflare:dry-run
```

Only after the Tunnel health check succeeds, deploy the route configuration:

```sh
npx wrangler deploy --config cloudflare/wrangler.jsonc
```

Then run the live verification commands from the task specification. If the
origin is unavailable, do not attach the routes: doing so would replace working
Pages fallbacks with 502/503 responses.
