"""FastAPI application: mounts every module router under /api/v1.

Run locally: uv run uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.modules.alerts.router import router as alerts
from app.modules.auth.router import router as auth
from app.modules.batches.router import router as batches
from app.modules.catalog.router import router as catalog
from app.modules.checkout.router import router as checkout
from app.modules.counters.router import router as counters
from app.modules.jobs.router import router as jobs
from app.modules.labeling.router import router as labeling
from app.modules.model_registry.router import router as model_registry
from app.modules.reports.router import router as reports
from app.modules.shifts.router import router as shifts
from app.modules.system.router import router as system
from app.modules.thresholds.router import router as thresholds
from app.modules.users.router import router as users

ROUTERS = [
    auth,
    users,
    counters,
    shifts,
    checkout,
    alerts,
    catalog,
    batches,
    labeling,
    jobs,
    model_registry,
    thresholds,
    reports,
    system,
]


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="HybridCheckout API",
        version="1.0.0",
        docs_url="/api/docs" if settings.env == "dev" else None,
        openapi_url="/api/v1/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for router in ROUTERS:
        app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
