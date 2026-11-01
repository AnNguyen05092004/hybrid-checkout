"""HTTP routes of the Checkout tag in api/openapi.yaml.

Operations (operationId):
    listTransactions
    createTransaction
    getTransaction
    changeCheckoutMode
    scanItem
    removeLine
    checkTray
    payTransaction
    cancelTransaction
    skipTrayCheck

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/transactions", tags=["Checkout"])
