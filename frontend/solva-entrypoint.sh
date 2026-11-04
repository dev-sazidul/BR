#!/bin/sh
# Apply pending database migrations, then start the app.
set -eu
(cd /migrator && node node_modules/prisma/build/index.js migrate deploy)
exec "$@"
