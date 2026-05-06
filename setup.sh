#!/bin/bash
# Run this script from inside the repo root using Git Bash
# bash setup.sh

BASE="$(pwd)"

echo "Creating project folder structure..."

mkdir -p "$BASE/backend/app/models"
mkdir -p "$BASE/backend/app/schemas"
mkdir -p "$BASE/backend/app/routers"
mkdir -p "$BASE/backend/app/services"
mkdir -p "$BASE/backend/alembic/versions"
mkdir -p "$BASE/frontend/src/pages"
mkdir -p "$BASE/frontend/src/components"
mkdir -p "$BASE/frontend/src/api"
mkdir -p "$BASE/frontend/src/context"
mkdir -p "$BASE/frontend/src/hooks"
mkdir -p "$BASE/docs"

echo "Folder structure created."

# Move docs
mv "$BASE/architecture.md" "$BASE/docs/" 2>/dev/null || true
mv "$BASE/roadmap.md" "$BASE/docs/" 2>/dev/null || true

echo "Docs moved to /docs"

# Backend virtual environment
cd "$BASE/backend"
python -m venv venv
source venv/Scripts/activate

pip install fastapi uvicorn[standard] sqlalchemy alembic psycopg2-binary \
    python-jose[cryptography] passlib[bcrypt] pydantic-settings python-dotenv \
    pydantic[email] httpx pytest pytest-asyncio

pip freeze > requirements.txt

echo "Backend dependencies installed and requirements.txt written."

# Alembic init
alembic init alembic

echo "Alembic initialized."

# Frontend scaffold
cd "$BASE/frontend"
npm create vite@latest . -- --template react --yes 2>/dev/null || true
npm install
npm install tailwindcss @tailwindcss/vite \
    react-router-dom axios \
    react-hook-form @hookform/resolvers zod \
    @tanstack/react-query \
    react-to-print \
    lucide-react \
    date-fns

echo "Frontend dependencies installed."
echo ""
echo "Setup complete. Open VS Code in the repo root."
