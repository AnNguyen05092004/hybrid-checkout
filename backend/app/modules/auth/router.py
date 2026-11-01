"""HTTP routes of the Auth, Profile tag in api/openapi.yaml.

Operations (operationId):
    login
    refreshToken
    logout
    getMe
    updateMe
    changePassword
    setManagerPin

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Auth", "Profile"])
