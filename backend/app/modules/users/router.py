"""HTTP routes of the Users tag in api/openapi.yaml.

Operations (operationId):
    listUsers
    createUser
    updateUser
    resetPassword

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["Users"])
