# Self-hosted deployment (openclaw VPS)

Docker image of the production build behind the host's Caddy. Vercel remains
the primary hosting; this stack is a self-hosted mirror for previews.

## Isolation

- Compose project: `piroelche`
- Bind: `127.0.0.1:8093` only; Caddy on the host terminates TLS
- No volumes, databases or networks shared with the other stacks. The
  container is read-only apart from `/tmp` and the Next image cache (tmpfs).
- No secrets are required. The lead receiver stays disabled.

## Deploy

1. Sync the repository to `/opt/piroelche/app` (from a workstation):

   ```bash
   rsync -az --delete --filter=':- .gitignore' --exclude .git --exclude deploy/.env \
     ./ hetzner-openclaw:/opt/piroelche/app/
   ```

2. On the VPS, `cd /opt/piroelche/app/deploy`, `cp .env.example .env` on the
   first run, then:

   ```bash
   docker compose build && docker compose up -d
   ```

3. Public HTTPS: point `piroelche.gravityroom.app` at the VPS and paste
   `Caddyfile.snippet` into the host Caddyfile, validate, reload.

4. Tailnet-only HTTPS (no DNS needed):

   ```bash
   tailscale serve --bg --https=8444 http://127.0.0.1:8093
   ```

   Serves https://hetzner-openclaw.taila10698.ts.net:8444 to tailnet members.

`PIROBOOM_SITE_URL` and `PIROBOOM_PUBLIC_SITE` are build arguments as well as
runtime variables, so changing them requires `docker compose build`.
