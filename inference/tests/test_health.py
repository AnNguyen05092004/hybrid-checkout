from fastapi.testclient import TestClient

from app.main import app


def test_health_without_model() -> None:
    body = TestClient(app).get("/health").json()
    assert body == {"status": "ok", "ready": False, "model_version_id": None}
