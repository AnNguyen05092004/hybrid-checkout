"""HTTP routes of the Shifts tag in api/openapi.yaml.

Operations (operationId):
    openShift
    getCurrentShift
    getShiftSummary
    closeShift

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/shifts", tags=["Shifts"])
