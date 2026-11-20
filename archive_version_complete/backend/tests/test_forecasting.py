from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_forecast_wfp_millet_dakar_2025_2026():
    r = client.post(
        "/api/forecast/run",
        json={"source": "wfp", "commodity": "Mil", "region": "Dakar", "market": "ALL", "horizon": 6},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["eligible"] is True
    assert data["best_model"] in ("Holt-Winters", "ARIMA", "Prophet")
    assert len(data["forecast_series"]) == 6

    diag = data["series_diagnostics"]
    assert diag["first_observed_date"] >= "2025-01-01"
    assert diag["last_observed_date"] == "2026-03-01"
    assert diag["observed_months_2025"] == 11
    assert diag["observed_months_2026"] == 3
    assert diag["available_2026_months"] == ["2026-01", "2026-02", "2026-03"]
    assert "2026-04" in diag["missing_2026_months"]

    # Historical series strictly separates 2025 and 2026 observations without pre-2025 points
    hist = data["historical_series"]
    assert all(h["date"] >= "2025-01-01" for h in hist)
    assert any(h["observed_2025"] is not None for h in hist)
    assert any(h["observed_2026"] is not None for h in hist)

    evaluated = [m for m in data["model_comparison"] if m["status"] == "evaluated"]
    assert len(evaluated) >= 2
    for m in evaluated:
        assert m["mae"] is not None
        assert m["rmse"] is not None
    sarima = next(m for m in data["model_comparison"] if m["model"] == "SARIMA")
    assert sarima["status"] == "unavailable"


def test_forecast_guardrail_rejects_sparse_2025_2026_series():
    # Sorgho in Dakar only has 3 observed months in 2025-2026
    r = client.post(
        "/api/forecast/run",
        json={
            "source": "wfp",
            "commodity": "Sorgho",
            "region": "Dakar",
            "market": "ALL",
            "horizon": 6,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["eligible"] is False
    assert "reason" in data


def test_forecast_guardrail_rejects_empty_csa_in_2025_2026():
    r = client.post(
        "/api/forecast/run",
        json={"source": "csa", "commodity": "ALL", "region": "ALL", "market": "ALL", "horizon": 6},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["eligible"] is False
