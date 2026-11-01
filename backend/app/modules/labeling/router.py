"""HTTP routes of the Labeling tag in api/openapi.yaml.

Operations (operationId):
    listLabelTasks
    queueHardImage
    getNextLabelTask
    getLabelTask
    submitLabels
    skipLabelTask

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/label-tasks", tags=["Labeling"])
