"""HTTP routes of the Reports tag in api/openapi.yaml.

Operations (operationId):
    getDashboard
    getCashierStats
    getMonitoring

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["Reports"])
