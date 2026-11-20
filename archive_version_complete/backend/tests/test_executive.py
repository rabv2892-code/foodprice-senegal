from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_executive_dashboard_default_scope_real_2025_2026():
    r = client.get("/api/executive/dashboard?source=wfp")
    assert r.status_code == 200
    d = r.json()
    assert d["empty"] is False
    assert d["focus_commodity"] == "Mil"
    assert d["focus_auto_selected"] is True

    k = d["kpis"]
    assert k["latest_price"]["date"] == "2026-03-15"
    assert k["latest_price"]["ym"] == "2026-03"
    assert k["latest_price"]["value"] > 0
    assert k["monthly_change"]["previous_ym"] == "2026-02"
    assert k["monthly_change"]["matched_markets"] > 0
    assert k["active_markets"]["value"] == 47
    assert k["active_markets"]["regions_count"] == 14
    assert k["active_markets"]["date_min"] >= "2025-01-01"
    assert k["active_markets"]["date_max"] <= "2026-12-31"
    assert k["forecast"]["eligible"] is True
    assert k["forecast"]["model"]
    assert len(k["forecast"]["series"]) == 6
    assert k["forecast"]["series"][0]["ym"] == "2026-04"

    # Only real observed months; no invented 2026 month after March
    yms = [p["ym"] for p in d["price_evolution"]]
    assert all("2025-01" <= ym <= "2026-03" for ym in yms)
    assert d["scope"]["available_2026_months"] == ["2026-01", "2026-02", "2026-03"]
    apr = next(m for m in d["monthly_comparison"] if m["month"] == 4)
    assert apr["price_2026"] is None and apr["missing_2026"] is True

    # Distribution counts real relevés
    assert d["distribution"]["total"] == 4779
    assert sum(c["count"] for c in d["distribution"]["by_category"]) == 4779

    assert len(d["regional_comparison"]["regions"]) == 14
    assert len(d["map_markets"]) == 47
    assert all(i["unit"] == d["top_products"]["unit"] for i in d["top_products"]["items"])


def test_executive_dashboard_filters_react_and_guardrails():
    r26 = client.get("/api/executive/dashboard?source=wfp&year=2026").json()
    assert r26["focus_commodity"] == "Mil"
    assert all(p["year"] == 2026 for p in r26["price_evolution"])
    assert r26["kpis"]["active_markets"]["date_min"] >= "2026-01-01"

    rd = client.get("/api/executive/dashboard?source=wfp&commodity=Sorgho&region=Dakar").json()
    assert rd["kpis"]["forecast"]["eligible"] is False
    assert "insuffisante" in rd["kpis"]["forecast"]["reason"]

    rc = client.get("/api/executive/dashboard?source=csa").json()
    assert rc["empty"] is True
    assert rc["kpis"] is None
