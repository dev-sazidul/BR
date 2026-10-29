# Solva

Solva removes the background from one image and returns a transparent PNG. The page is a single upload flow: drop a picture, wait for the model, then download the cutout. A separate portrait page frames that cutout for a profile photo or a document size. Document sizes are stored with their source, and unverified sizes are marked.

The interface is original. It is not a copy of remove.bg.

## Stack

- React, TypeScript, Vite, Tailwind CSS, React Router, Axios
- Django, Django REST Framework, Pillow
- Background removal with ONNX Runtime and the public U²-Net weights, behind a small provider interface
- Optional PostgreSQL, Redis, and Celery. Anonymous removal does not need them.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health/` | Process is up. `ai.available` tells you whether removal can run. |
| `GET` | `/api/v1/config/` | Public limits only. No secrets. |
| `POST` | `/api/v1/images/remove-background/` | Multipart field `image`. Returns a signed result URL. |
| `GET` | `/api/v1/images/results/<token>/` | Inline transparent PNG. |
| `GET` | `/api/v1/images/results/<token>/download/?format=png` | PNG download. |
| `GET` | `/api/v1/images/results/<token>/download/?format=jpeg&background=%23FFFFFF` | JPEG flattened onto a hex color. |
| `POST` | `/api/v1/auth/register/` | Optional account. Returns a token and the profile. |
| `POST` | `/api/v1/auth/login/` | Returns a token. Send it as `Authorization: Token <token>` on account routes only. |
| `POST` | `/api/v1/auth/logout/` | Deletes that token. |
| `GET` / `PATCH` / `DELETE` | `/api/v1/auth/me/` | Read or update the signed-in profile, or delete the account. |
| `POST` | `/api/v1/auth/change-password/` | Replaces the password and issues a new token. |
| `POST` | `/api/v1/auth/password-reset/` | Emails a reset link when mail is configured. The response does not say whether the email exists. |
| `POST` | `/api/v1/auth/password-reset/confirm/` | Sets a new password from the link. |
| `GET` | `/api/schema/` | OpenAPI schema (YAML). |
| `GET` | `/api/docs/` | Swagger UI. |

How to open Swagger UI, try an upload, and regenerate `docs/openapi.yaml` is in [docs/swagger.md](docs/swagger.md).

Errors look like:

```json
{"error": {"code": "invalid_image", "message": "This file is not a valid PNG, JPG, or WebP image.", "details": {}}}
```

The original upload is not stored. The PNG result is kept under a random name until `IMAGE_RETENTION_MINUTES` (default 30). Cleanup runs on each removal request, when an expired link is opened, via `python manage.py cleanup_results`, and on a Celery beat schedule when Redis is configured. If the server is stopped, leftover files are deleted the next time cleanup runs.

## Local development

Use Python 3.12 or 3.13. Python 3.14 is not a good target for the ONNX runtime yet. Docker uses 3.12.

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
cd backend
python manage.py migrate
python manage.py runserver
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to http://127.0.0.1:8000. Copy `backend/.env.example` to `backend/.env` only when you need to override a setting.

Accounts are optional. Guests can still upload, preview, and download. A signed-in browser keeps the API token in `localStorage` when Remember me is on, and in `sessionStorage` when it is off. The token is sent only to `/api/v1/auth/` routes that need it, so a stale token does not block background removal. Run `python manage.py migrate` after pulling this feature so the email field and token table exist.

After a cutout is ready, Edit image opens a browser-side editor. Natural background photographs, a background photo from the device, a solid color, crop, rotate, resize, undo, and export reuse the transparent PNG already returned by the API. They do not call the removal service again. The built-in photographs are resized copies of Wikimedia Commons files and each one keeps its author and license in the editor. PNG export can keep the alpha channel. JPG export flattens onto the selected background, or white when the background is transparent.

Password reset emails use Django's mail settings. In development they print to the console. In production, set `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`, and `FRONTEND_ORIGIN` to the public site origin, or the reset link is not delivered. When the site and API are on different hosts, add the site origin to `DJANGO_CORS_ALLOWED_ORIGINS`. On Vercel without Postgres, SQLite lives in `/tmp` and accounts do not survive a new instance. Use Postgres if accounts should last.

### AI model

The default provider is `rembg` and the default model is `u2net`. The server downloads that ONNX file on the first removal into `U2NET_HOME` or `~/.u2net`. The file is about 176 MB. The first request can take several minutes and needs network access. Later requests reuse the file.

`REMBG_MODEL=u2netp` is a smaller, faster model (about 4 MB) with lower edge quality. Those two names are the supported models. The `rembg` Python package is not installed. It pulls OpenCV, SciPy, and Numba, and that set does not fit in a 500 MB serverless function. Masks are applied directly. There is no alpha-matting pass.

Health stays HTTP 200 when the process is up. Read `ai.available` and `ai.model_cached`. If ONNX Runtime is not installed, or the model cannot be downloaded, `POST /api/v1/images/remove-background/` returns **503** and does not pretend the original image was processed.

To send images to an external remover instead, set:

```bash
AI_PROVIDER=http
AI_HTTP_ENDPOINT=https://example.com/remove
AI_HTTP_API_KEY=optional-bearer-token
```

The endpoint must accept a multipart field named `image` and return an image. Redirects are refused. The URL is operator configuration, not something the browser can choose. With this provider, uploaded images leave the server. The privacy page says so when `ai_provider` is `http`.

## Tests

```bash
source .venv/bin/activate
cd backend && ruff check . && python manage.py test
cd frontend && npm test && npm run typecheck && npm run lint
```

Backend tests use a fake provider for the API, and they run ONNX Runtime only when the selected model's weights are already on disk. A missing model skips that one test.

## Vercel

Vercel reads `manage.py` after it installs Python packages. It prefers `backend/pyproject.toml` over `backend/requirements.txt`. That file now lists the same dependencies. The repository root `requirements.txt` repeats them, because Vercel does not follow a `-r` include. Python is pinned to 3.12 in `.python-version`.

Set `DJANGO_SECRET_KEY` in the Vercel project. `DJANGO_ALLOWED_HOSTS` can stay as `localhost` for local use; a Vercel deploy also allows `.vercel.app`. The function filesystem is temporary: result files and the SQLite database live under `/tmp` and do not survive a new instance. Use `REMBG_MODEL=u2netp` for the first deploy. The default `u2net` file is about 176 MB and the download often exceeds a serverless time limit. Background removal still returns an error if the model cannot be loaded. It does not return the original image as a cutout. The function installs ONNX Runtime and NumPy, and leaves out the larger imaging libraries that previously made the bundle about 660 MB.

## Docker

Docker Compose is prepared. This workspace did not have a Docker daemon, so the compose file was not executed here.

```bash
cp .env.example .env
# Set DJANGO_SECRET_KEY and POSTGRES_PASSWORD.
docker compose up --build
```

The site is published on http://localhost:8080. nginx serves the frontend and proxies `/api/` to Gunicorn. Postgres stores Django's tables (including the reserved user model). Redis, a Celery worker, and Celery beat delete expired results on a timer. The API also deletes expired files itself, so removal works if those containers are down.

The sample compose file is HTTP. Before a public deploy:

- Terminate TLS in front of nginx.
- Set `DJANGO_SECURE_SSL_REDIRECT=true` and a real `DJANGO_ALLOWED_HOSTS`.
- Set `DJANGO_BEHIND_PROXY=true` only for a proxy you control. nginx in this repo sets `X-Forwarded-For` to the connecting address, not to a client-supplied list.
- Keep nginx `client_max_body_size` above `MAX_UPLOAD_BYTES`.
- Use one Gunicorn worker on a small machine. Each worker loads its own copy of the ONNX model.
- Point `U2NET_HOME` at a persistent volume so the model is not downloaded on every boot.

## Configuration

See `backend/.env.example` and the root `.env.example`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAX_UPLOAD_BYTES` | 10485760 | Upload limit. |
| `MAX_DIMENSION_PX` | 4096 | Longest allowed side. |
| `MAX_IMAGE_PIXELS` | 16000000 | Decompression-bomb ceiling. |
| `IMAGE_RETENTION_MINUTES` | 30 | How long a result link works. |
| `PROCESSING_TIMEOUT_SECONDS` | 120 | When the HTTP call gives up. The model thread may still finish. |
| `BACKGROUND_REMOVAL_THROTTLE` | `10/minute` | Per-IP limit for removal. |
| `CONTACT_EMAIL` | empty | Shown on the contact page. No mail is sent. |
| `TRUST_PROXY_HEADERS` | false | Use `X-Forwarded-For` for rate limits. |

`GET /api/v1/config/` is what the page uses for the upload limit, retention time, and contact email.

## Advertising

The page reserves four ad areas: under the header, under the upload workspace, between How it works and Features, and above the footer. They are labeled “Advertisement” and sit outside the drop zone, the preview, and the download buttons.

Nothing calls Google until the configuration is real.

1. In AdSense, add the site and wait until the account is approved. This repository does not do that for you.
2. Create ad units if you want manual placements. Copy each slot ID.
3. Put the public publisher ID in `frontend/.env` (local) or the root `.env` before `docker compose build` (the value is baked into the static files):

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

After a rebuild, confirm in the browser network panel that `adsbygoogle.js` is absent before you allow ads, present once after you allow them, and absent again if the publisher ID is cleared. An ad blocker or a rejected account should leave the upload flow working. nginx already allows the AdSense hosts in the content security policy so the script is not blocked by the container.

## Privacy and security

Uploads are checked with Pillow, not by file extension. Limits cover size, dimensions, pixel count, and animation. Result filenames are random. Download links are signed and expire. Filesystem paths are not returned. Secrets stay in the environment.

There is no account in this version. `apps.accounts.User` exists so a custom user model is in the first migration, which Django requires before accounts can be added later. Removal does not create users.

## What is intentionally not built

Accounts, history, batch jobs, custom background images, resizing, credits, payments, and an admin analytics dashboard are extension points, not features of this version. The provider interface and `/api/v1/` prefix are the seams for a second model or a queue later.
