"""HTTP routes of the Jobs tag in api/openapi.yaml.

Operations (operationId):
    listJobs
    getJob
    getJobLog
    cancelJob
    retryJob

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/jobs", tags=["Jobs"])
