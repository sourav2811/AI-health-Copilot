# Local Docker demo

This container runs the built application with Wrangler's local D1/R2 emulation. It is a **single-user hackathon demo**, not a production healthcare server. Use synthetic records. The existing hosted Site continues to use its own authentication and separate storage.

Install Docker Desktop with its WSL 2 backend on Windows and start it. From this directory:

```powershell
docker compose up --build -d
docker compose logs -f
```

Open http://localhost:3000 after the health check succeeds. The gateway supplies a fixed local demo identity, removes supplied identity headers, and rejects other hostnames and cross-origin requests. The host port is bound to loopback only. Do not change that binding or expose this service through a tunnel: public hosting needs real authentication and a production storage/runtime plan.

The `health-data` volume stores database and upload data across container restarts. `docker compose down` stops the app and preserves that volume. Avoid `down -v` unless you intend to erase local records.

Compose optionally loads the already approved `../.env.local` at runtime. Secrets and existing local data are excluded from the Docker build. Without an API key, use the prepared sample flow. Live AI also requires active API billing. The container does not provide ChatGPT sign-in; all local visitors use one demo profile.

For a VPS/public URL, provide the destination server and domain. Docker packages the app; a reachable host, TLS and production authentication/storage still need configuring. This local demo must not be presented as that production deployment.

References: [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [Cloudflare local storage emulation](https://developers.cloudflare.com/workers/local-development/local-data/).
