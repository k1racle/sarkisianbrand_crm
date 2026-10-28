#!/bin/sh
set -eu
# Runs only on first initialization of an empty PostgreSQL volume.
# psql quotes the password as a literal; no value is interpolated into SQL text.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE sarkisian LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'app_password') \gexec
GRANT CONNECT ON DATABASE sarkisian_brand TO sarkisian;
GRANT USAGE ON SCHEMA public TO sarkisian;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sarkisian;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sarkisian;
SQL
