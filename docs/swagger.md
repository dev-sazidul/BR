# Solva API and Swagger

The API is documented with [OpenAPI 3](https://swagger.io/specification/) through Django REST Framework and drf-spectacular. Swagger UI is the page where you can read those operations and send a trial request.

## Open the docs

Start the API, then open:

- Swagger UI: http://127.0.0.1:8000/api/docs/
- Raw schema (YAML): http://127.0.0.1:8000/api/schema/

There is no account. The page loads the schema from `/api/schema/`. If that request fails, the UI stays empty.

```bash
cd backend
python manage.py runserver
```

## What the page lists

| Tag | Operation | Method and path |
| --- | --- | --- |
| System | Service health | `GET /api/v1/health/` |
| System | Public configuration | `GET /api/v1/config/` |
| Images | Remove a background | `POST /api/v1/images/remove-background/` |
| Images | Preview a cutout | `GET /api/v1/images/results/{token}/` |
| Images | Download a cutout | `GET /api/v1/images/results/{token}/download/` |

Health returns 200 even when the model is not ready. Use `ai.available` in that body. A removal that cannot run returns **503** or **504** and does not send the original image back as a cutout.

## Try a removal in Swagger UI

1. Open **Images / Remove a background**.
2. Choose **Try it out**.
3. Under `image`, pick a PNG, JPEG, or WebP file.
4. Execute.

A successful body looks like this:

```json
{
  "id": "32 lowercase hex characters",
  "original_filename": "portrait.png",
  "width": 800,
  "height": 600,
  "output_format": "png",
  "result_url": "/api/v1/images/results/<signed-token>/",
  "download_url": "/api/v1/images/results/<signed-token>/download/",
  "expires_at": "2026-10-28T12:30:00Z"
}
```

Copy `result_url` into the browser to see the transparent PNG. For a file download, call `download_url`:

- PNG: `?format=png`
- JPEG on white: `?format=jpeg&background=%23FFFFFF`
- JPEG on another color: `background` must be `#RRGGBB`. Encode `#` as `%23` in the query string.

The signed token expires after `retention_minutes` from `GET /api/v1/config/` (30 minutes unless the server is configured otherwise). An expired link returns **410**. An unknown token returns **404**.

Errors use one shape:

```json
{"error": {"code": "invalid_image", "message": "This file is not a valid PNG, JPG, or WebP image.", "details": {}}}
```

Common codes are `invalid_image`, `file_too_large`, `invalid_format`, `result_not_found`, `result_expired`, `ai_unavailable`, and `timeout`.

## Rebuild the schema file

`docs/openapi.yaml` is generated. After you change a view, serializer, or `SPECTACULAR_SETTINGS`, regenerate it from the backend directory:

```bash
python manage.py spectacular --validate --file ../docs/openapi.yaml
```

`--validate` fails the command when the schema is incomplete or inconsistent. Commit the updated YAML with the code change so the file matches the running API.

The live schema at `/api/schema/` is produced on each request. You do not need to restart just to refresh Swagger UI after a code reload.
