"""HTTP routes of the Alerts tag in api/openapi.yaml.

Operations (operationId):
    listAlerts
    getReviewQueue
    confirmFalseAlarm
    reviewAlert

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/alerts", tags=["Alerts"])
