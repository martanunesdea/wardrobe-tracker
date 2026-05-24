# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime with Flask + gunicorn
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Schema path resolved by models/database.py: ../../database/schema.sql
# relative to /app/models/ → /database/schema.sql
COPY database/schema.sql /database/schema.sql

# Copy React build into the location Flask expects
COPY --from=frontend-build /build/build /app/static_frontend

ENV FLASK_DEBUG=false \
    PORT=8000 \
    DB_PATH=/data/wardrobe.db \
    UPLOAD_FOLDER=/data/uploads

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "server:app"]
