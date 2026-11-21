# Solva

Solva removes the background from one image and returns a transparent PNG. The page is a single upload flow: drop a picture, wait for the model, then download the cutout. A separate portrait page frames that cutout for a profile photo or a document size. Document sizes are stored with their source, and unverified sizes are marked.

The interface is original. It is not a copy of remove.bg.

## Architecture

```
browser ──HTTPS──▶ reverse proxy ──▶ web (Next.js) ──private network──▶ remover (FastAPI)
                                       │
                                       └── SQLite through Prisma (accounts only)
```

| Part | Where | Does |
| --- | --- | --- |
| `web` | `frontend/` | Every page and every public `/api/v1` route. Accounts, sessions, rate limits, upload checks. |
| `remover` | `remover/background_remover.py` | One file. Validates the image bytes, runs U²-Net through ONNX Runtime, cleans the edge colour, returns a PNG. |
| Database | `frontend/prisma/` | SQLite through Prisma. Users, sessions, and reset tokens. No images. |

The remover is internal. Docker publishes no port for it, and the browser never calls it. Next.js is its only client.

Nothing about an image is stored. The upload is processed in memory and the response to it is the PNG itself, so there are no result files, links, or cleanup jobs. JPG export happens in the browser.

## Public API

Served by Next.js. The full contract is in [docs/openapi.yaml](docs/openapi.yaml).

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | 200 while the site is up. `ai.available` says whether removal can run. |
| `GET` | `/api/v1/config` | Public limits only. |
| `GET` | `/api/v1/backgrounds/search?q=...&page=1&orientation=landscape` | Optional Pexels photo search for the editor. Requires server-only `PEXELS_API_KEY`. |
| `POST` | `/api/v1/images/remove-background` | Multipart field `image`. Returns `image/png` with `X-Image-Width` and `X-Image-Height`. |
| `POST` | `/api/v1/auth/register` | Creates an account and signs in. |
| `POST` | `/api/v1/auth/login` | Signs in. `remember: false` gives a browser-session cookie. |
| `POST` | `/api/v1/auth/logout` | Ends this browser's session. |
| `GET` / `PATCH` / `DELETE` | `/api/v1/auth/me` | Read the account, change the name, or delete the account (needs the password). |
| `POST` | `/api/v1/auth/change-password` | Signs out every other browser. |
| `POST` | `/api/v1/auth/password-reset` | Emails a one-time link. Same answer whether or not the email exists. |
| `POST` | `/api/v1/auth/password-reset/confirm` | Sets the new password from that link. |

Errors look like:

```json
{"error": {"code": "invalid_image", "message": "This file is not a valid PNG, JPG, or WebP image.", "details": {}}}
```

Sessions live in an httpOnly, SameSite=Lax cookie, `solva_session`. The database stores only a SHA-256 of it. A second cookie, `solva_signed_in`, holds no secret: it tells the page whether to ask `/me`, so guests make no account request. Writes to `/auth` routes are refused when the `Origin` header names another site. Passwords are hashed with scrypt.

## Local development

You need Node 22 or later and Python 3.12 or later. Docker uses Node 22 and Python 3.12.

**1. The remover**

```bash
cd remover
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python background_remover.py       # http://127.0.0.1:8001
```

The first start downloads the model into `U2NET_HOME` or `~/.u2net`. `u2net` is about 176 MB. Set `REMBG_MODEL=u2netp` for a 4 MB model with weaker edges. `python background_remover.py download` fetches the model and exits.

**2. The site**

```bash
cd frontend
npm ci                 # also generates the Prisma client
npm run db:migrate     # creates frontend/data/solva.db
npm run dev            # http://127.0.0.1:5173
```

Copy `frontend/.env.example` to `frontend/.env` only to change a default. Without `SMTP_HOST`, development prints password reset emails to the terminal.

## Tests

```bash
cd remover && ruff check . && pytest
cd frontend && npm test && npm run typecheck && npm run lint && npm run build
```

The remover tests use a fake mask for the HTTP and validation cases. One test runs the real model, and only when its weights are on disk. The site tests include route tests against a temporary SQLite database, with the remover stubbed.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

This builds two images and starts them:

- `remover`: no published port. The model downloads once into the `model_data` volume.
- `web`: published on `127.0.0.1:8080` only. Pending migrations are applied each time it starts. The SQLite database lives in the `app_data` volume. Back that volume up: it holds every account.

The first start of `remover` downloads the model, so the first removal waits for that. `GET /api/v1/health` shows `ai.model_cached: true` once it is on disk.

Before a public deploy:

- Put a TLS reverse proxy (Caddy, nginx) in front of `web` and set `SITE_URL` to the public `https://` origin. Session cookies become `Secure` automatically.
- Keep `TRUSTED_PROXY_COUNT` equal to the number of proxies in front of `web`. Rate limits use the address the nearest proxy saw. With no proxy in front, a client can pick its own address.
- Keep the proxy's body limit above `MAX_UPLOAD_BYTES`.
- Set `REMOVER_TOKEN` for a second lock between the two services.
- Rate limits are counted in memory, which suits one `web` container. Several replicas would each count separately.

## Changing the database later

The Prisma schema uses no SQLite-only features. To move to Postgres or MySQL, change `provider` in `frontend/prisma/schema.prisma`, swap the SQLite driver adapter in `frontend/src/server/db.ts` for the new database's adapter, point `DATABASE_URL` at it, and create a fresh migration. Accounts in the old SQLite file have to be copied across.

## Configuration

Docker reads the root `.env` (see `.env.example`). Local development reads `frontend/.env` and the remover's environment.

| Variable | Default | Used by | Meaning |
| --- | --- | --- | --- |
| `SITE_URL` | `http://127.0.0.1:5173` | web | Public origin. Used in reset links. `https://` makes cookies Secure. |
| `DATABASE_URL` | `file:./data/solva.db` | web | SQLite file. Docker sets `file:/data/solva.db`. |
| `REMOVER_URL` | `http://127.0.0.1:8001` | web | Where the remover listens. |
| `REMOVER_TOKEN` | empty | both | Optional shared secret, sent as `X-Remover-Token`. |
| `REMBG_MODEL` | `u2net` | both | `u2net` or `u2netp`. |
| `REMOVER_PRELOAD` | `true` | remover | Load the model at start-up. |
| `MAX_UPLOAD_BYTES` | 10485760 | both | Upload limit. |
| `MAX_DIMENSION_PX` | 4096 | both | Longest allowed side. |
| `MAX_IMAGE_PIXELS` | 16000000 | remover | Decompression-bomb ceiling. |
| `PROCESSING_TIMEOUT_SECONDS` | 120 | both | When removal gives up with 504. ONNX cannot be cancelled, so the worker may still finish. |
| `BACKGROUND_REMOVAL_RATE` | `10/minute` | web | Per-address limit for removal. |
| `PEXELS_API_KEY` | empty | web | Optional server-only key for the free Pexels photo search. Never sent to the browser. |
| `BACKGROUND_SEARCH_RATE` | `60/hour` | web | Per-address limit for uncached Pexels searches. |
| `AUTH_RATE` | `8/minute` | web | Per-address limit for account writes. |
| `TRUSTED_PROXY_COUNT` | 1 | web | Proxies in front of web that append to `X-Forwarded-For`. |
| `DISABLE_RATE_LIMITS` | false | web | For local testing only. |
| `CONTACT_EMAIL` | empty | web | Shown on the contact page. No mail is sent. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | empty | web | Password reset email. |

## Install the app

Solva is a progressive web app. There is no APK, IPA, or desktop installer. Open `/apps` from Apps Download in the header, or follow the steps for the device.

Android Chrome shows Install App when the browser allows it. Otherwise use the Chrome menu and choose Install app or Add to Home screen.

iPhone and iPad only install from Safari: tap Share, then Add to Home Screen, then Add. Other iOS browsers cannot add the icon.

Chrome and Edge on Windows, macOS, and Linux use the install icon in the address bar, or the browser menu. Safari on macOS uses Share, then Add to Dock. Firefox does not install the app.

The installed app needs a connection to remove a background, sign in, or download a new result. Pages already opened can open again offline. A new deploy replaces the previous service worker the next time the app loads. Installation requires HTTPS; `next dev` does not register the service worker.

## Smart editor backgrounds

The editor keeps the uploaded cutout as the untouched transparent foreground. Its existing canvas compositor places the chosen scene behind it and retains the existing lighting match and contact-shadow controls. Smart search samples the cutout's visible pixels for a dominant color and uses the image's portrait/landscape shape; add a scene or subject description for semantic search terms. This is lightweight browser-side analysis, not a semantic image-recognition model.

To enable online search, set `PEXELS_API_KEY` in the server environment (the root `.env` for Docker, or `frontend/.env` for local development), then restart/redeploy the web service. Pexels is a free, optional API with per-key request limits. The endpoint makes server-side authenticated requests, normalizes queries, caches results for up to 24 hours in each web process, applies a per-IP limit, and guards upstream misses at 180/hour and 18,000 per 30-day window per process. The Pexels key, process cache, and quota guard are process-local; keep a single web replica unless you add shared cache/quota storage. Search cards show photographer credit and link to Pexels; keep that credit visible when using the photos. If the key is absent or Pexels is unavailable, the editor explains the problem and its built-in presets and custom image upload remain usable. See Pexels' [API documentation](https://www.pexels.com/api/documentation/) for current usage rules and limits.

AI background generation is unavailable in this deployment. The configured remover runs U²-Net through CPU ONNX Runtime; the Docker setup includes no image-generation model or GPU. No hosted generator, payment method, or credit-based service is configured. The editor says so and does not pretend to generate an image. Existing foreground blending uses the original alpha cutout, lighting adjustment, and editable contact shadow; it does not warp or regenerate the subject.

## Advertising

The page reserves four ad areas: under the header, under the upload workspace, between How it works and Features, and above the footer. They are labeled “Advertisement” and sit outside the drop zone, the preview, and the download buttons.

Nothing calls Google until the configuration is real.

1. In AdSense, add the site and wait until the account is approved. This repository does not do that for you.
2. Create ad units if you want manual placements. Copy each slot ID.
3. Put the public publisher ID in `frontend/.env` (local) or the root `.env` before `docker compose build` (the value is baked into the page bundle):

```bash
VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
```

Replace the example. `ca-pub-` must be followed by 16 digits. The X’s are not an ID, and the script stays unloaded while they are present.

4. Choose one mode.

| `VITE_ADSENSE_MODE` | What the page does |
| --- | --- |
| `manual` (default) | Renders one unit per slot ID: header, workspace, mid-page, footer. Leave Auto ads off in the AdSense account. |
| `auto` | Loads the AdSense script and does not render those units. Turn Auto ads on in the account. |

Slot IDs live in `frontend/src/ads/adConfig.ts` (`adSlotIds`) and can be overridden with `VITE_ADSENSE_SLOT_HEADER`, `VITE_ADSENSE_SLOT_WORKSPACE`, `VITE_ADSENSE_SLOT_MID`, and `VITE_ADSENSE_SLOT_FOOTER`. Leave a slot empty and that box stays a plain reserved area in manual mode.

`VITE_ADSENSE_ENABLED=false` removes every placement. Leave it empty to show placeholders while running `npm run dev`, and to keep a production build quiet until a valid publisher ID is set.

`VITE_ADSENSE_REQUIRE_CONSENT` defaults to true. The page stores “allow” or “not now” in this browser and does not insert the AdSense script before “allow”. That control is not a Google-certified consent platform. If you serve ads in the EEA, the UK, or Switzerland, use a certified platform as well. The privacy page says this.

After a rebuild, confirm in the browser network panel that `adsbygoogle.js` is absent before you allow ads, present once after you allow them, and absent again if the publisher ID is cleared. An ad blocker or a rejected account should leave the upload flow working. The production content security policy allows the AdSense hosts so the script is not blocked by the site server.

## Privacy and security

- Uploads are checked with Pillow, not by file extension: size, dimensions, pixel count, and animation. Oversized images are refused from their header, before the pixels are decoded.
- Neither the upload nor the result is written to disk.
- Request bodies are read with a byte limit, so a missing or false `Content-Length` cannot get past it.
- Secrets stay in the environment. `/api/v1/config` returns limits only.

## Not built

History, batch jobs, credits, payments, and an admin dashboard are not features of this version. Accounts exist but are not linked to uploads.
