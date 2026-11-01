# Backend API, worker and trainer share this image. Build context: the repository root.
FROM python:3.12-slim AS base
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /srv/backend
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1

COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-dev --no-install-project
COPY database/schema.sql /srv/database/schema.sql
COPY backend/ ./
ENV PATH="/srv/backend/.venv/bin:$PATH"

FROM base AS api
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS worker
CMD ["celery", "-A", "app.worker.celery_app", "worker", "-Q", "cpu", "--loglevel", "info"]

# Trainer adds the PyTorch extra; needs the NVIDIA container runtime.
FROM base AS trainer
RUN uv sync --no-dev --extra ml
CMD ["celery", "-A", "app.worker.celery_app", "worker", "-Q", "gpu", "--concurrency", "1", "--loglevel", "info"]
