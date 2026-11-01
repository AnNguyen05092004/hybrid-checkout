"""HTTP routes of the Thresholds tag in api/openapi.yaml.

Operations (operationId):
    listThresholds
    saveThresholds
    listThresholdHistory
    previewThresholds

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/thresholds", tags=["Thresholds"])
