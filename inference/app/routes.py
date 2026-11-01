"""Routes of api/inference.openapi.yaml. Every route except /health requires the service bearer token."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", operation_id="getHealth")
def get_health() -> dict:
    # Skeleton only: Step 9 reports whether a checkpoint is loaded.
    return {"status": "ok", "ready": False, "model_version_id": None}
