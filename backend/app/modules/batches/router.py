"""HTTP routes of the Batches tag in api/openapi.yaml.

Operations (operationId):
    listBatches
    createBatch
    getBatch
    listSamples
    uploadSamples
    reviewSamples
    createComposites
    startTraining

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/batches", tags=["Batches"])
