"""HTTP routes of the Counters tag in api/openapi.yaml.

Operations (operationId):
    listCounters
    createCounter
    updateCounter
    testCapture

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/counters", tags=["Counters"])
