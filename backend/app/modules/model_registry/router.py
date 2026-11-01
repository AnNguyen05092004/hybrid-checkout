"""HTTP routes of the Models tag in api/openapi.yaml.

Operations (operationId):
    listModelVersions
    getActiveModelVersion
    getModelVersion
    deployModelVersion
    rejectModelVersion
    listDeployments
    rollbackModel

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Models"])
