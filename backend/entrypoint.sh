#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."
until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(os.environ['DATABASE_URL'])
    print('PostgreSQL is ready')
except Exception as e:
    print(f'Not ready: {e}')
    sys.exit(1)
" 2>/dev/null; do
  sleep 2
done

echo "🔄 Running database migrations..."
alembic upgrade head

echo "🌱 Seeding initial data..."
python -m app.seed

echo "🚀 Starting SARMC Batching ERP backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
