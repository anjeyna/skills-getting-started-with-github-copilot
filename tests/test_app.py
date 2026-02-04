from fastapi.testclient import TestClient
import uuid

from src.app import app

client = TestClient(app)


def test_get_activities_contains_programming_class():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert "Programming Class" in data
    assert "participants" in data["Programming Class"]


def test_signup_and_unregister_flow():
    activity = "Programming Class"
    unique_email = f"test+{uuid.uuid4().hex[:8]}@example.com"

    # Ensure email is not already present
    res = client.get(f"/activities")
    assert res.status_code == 200
    assert unique_email not in res.json()[activity]["participants"]

    # Sign up
    res = client.post(f"/activities/{activity}/signup?email={unique_email}")
    assert res.status_code == 200
    body = res.json()
    assert "Signed up" in body.get("message", "")

    # Verify participant was added
    res = client.get("/activities")
    assert res.status_code == 200
    assert unique_email in res.json()[activity]["participants"]

    # Attempt duplicate signup -> 400
    res = client.post(f"/activities/{activity}/signup?email={unique_email}")
    assert res.status_code == 400

    # Unregister participant
    res = client.delete(f"/activities/{activity}/participants?email={unique_email}")
    assert res.status_code == 200
    body = res.json()
    assert "Removed" in body.get("message", "")

    # Verify participant removed
    res = client.get("/activities")
    assert res.status_code == 200
    assert unique_email not in res.json()[activity]["participants"]


def test_unregister_nonexistent_participant_returns_404():
    activity = "Programming Class"
    fake_email = f"noone+{uuid.uuid4().hex[:8]}@example.com"
    res = client.delete(f"/activities/{activity}/participants?email={fake_email}")
    assert res.status_code == 404
