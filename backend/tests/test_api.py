import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import get_db
from app.core.security import create_access_token


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


async def test_signup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/signup", json={
            "full_name": "Test User",
            "email": f"test_{__import__('time').time()}@example.com",
            "age": 25,
            "password": "Test@123",
            "confirm_password": "Test@123",
        })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "Test@123",
        })
    assert resp.status_code in [200, 401]
