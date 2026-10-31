# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies (cached layer)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build — VITE_API_BASE is intentionally empty so
# Axios uses relative paths (/api/...) served by the same FastAPI origin.
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Python backend + serve built frontend ────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies first for better layer caching
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --prefer-binary --default-timeout=1000 -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy the built React app from Stage 1 so FastAPI can serve it
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure uploads directory exists (bind-mounted in production)
RUN mkdir -p ./backend/uploads

# SQLite DB and uploads are persisted via volumes at runtime
VOLUME ["/app/backend/uploads"]

EXPOSE 8000

WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

