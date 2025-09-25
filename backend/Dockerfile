# backend/Dockerfile
FROM python:3.11-slim

# System deps (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create non-root user (uid/gid 100 to match typical host user)
RUN groupadd -g 1000 app && useradd -m -u 1000 -g 1000 app

WORKDIR /app
COPY backend/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app

# Drop privileges
USER app

# Expose internal port
EXPOSE 8000

# Start
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]