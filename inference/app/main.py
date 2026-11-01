"""FastAPI app of the recognition service: /detect, /cutouts, /model, /health.

Run locally: uv run uvicorn app.main:app --port 9100
"""

from fastapi import FastAPI

from app.routes import router

app = FastAPI(title="HybridCheckout Inference API", version="1.0.0")
app.include_router(router)
