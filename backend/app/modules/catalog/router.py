"""HTTP routes of the Catalog tag in api/openapi.yaml.

Operations (operationId):
    listCategories
    listSkus
    createSku
    importSkus
    getSku
    updateSku

Routes validate input, check the role, call the service and return the contract schema. No SQL, no business rule.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Catalog"])
