"""
Smoke tests for authentication endpoints.
"""


def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert "token" in data
    assert data["user"]["email"] == "test@example.com"


def test_register_duplicate(client):
    payload = {"email": "dup@example.com", "password": "securepassword123"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


def test_register_invalid_email(client):
    resp = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "securepassword123",
    })
    assert resp.status_code == 400
    assert "email" in resp.get_json()["error"].lower()


def test_register_short_password(client):
    resp = client.post("/api/auth/register", json={
        "email": "short@example.com",
        "password": "abc",
    })
    assert resp.status_code == 400


def test_login_success(client):
    client.post("/api/auth/register", json={
        "email": "login@example.com",
        "password": "securepassword123",
    })
    resp = client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "securepassword123",
    })
    assert resp.status_code == 200
    assert "token" in resp.get_json()


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wrong@example.com",
        "password": "securepassword123",
    })
    resp = client.post("/api/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrongpassword123",
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post("/api/auth/login", json={
        "email": "ghost@example.com",
        "password": "doesntmatter1",
    })
    assert resp.status_code == 401


def test_security_headers(client):
    resp = client.get("/api/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
