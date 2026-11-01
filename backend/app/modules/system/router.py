"""HTTP routes of the System tag in api/openapi.yaml.

Operations (operationId):
    listAuditLogs
    listSettings
    updateSettings
    getStorageUsage
    getHealth

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get("/health", operation_id="getHealth")
def get_health() -> dict:
    # Skeleton only: Step 9 checks PostgreSQL, Redis, storage and the inference service.
    return {"status": "ok", "checks": {}}
