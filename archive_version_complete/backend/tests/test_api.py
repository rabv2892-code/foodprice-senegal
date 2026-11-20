from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_and_filters_strict_2025_2026():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["prophet_available"] is True
    assert body["official_period"]["start_date"] == "2025-01-01"
    assert body["official_period"]["end_date"] == "2026-12-31"

    rf = client.get("/api/filters?source=wfp")
    assert rf.status_code == 200
    f = rf.json()
    assert f["years"] == [2025, 2026]
    assert f["min_date"] == "2025-01-01"
    assert f["max_date"] == "2026-12-31"
    assert len(f["regions"]) == 14
    assert len(f["markets"]) == 47
    assert len(f["commodities"]) == 11


def test_overview_and_filters_reaction_2025_2026():
    r_all = client.get("/api/overview?source=wfp")
    assert r_all.status_code == 200
    all_data = r_all.json()
    assert all_data["kpis"]["total_observations"] == 4779
    ts = all_data["charts"]["time_series"]
    assert len(ts) == 15
    assert all(pt["ym"] >= "2025-01" and pt["ym"] <= "2026-12" for pt in ts)
    assert all(y["year"] in (2025, 2026) for y in all_data["charts"]["observations_by_year"])

    r_dakar = client.get("/api/overview?source=wfp&region=Dakar&commodity=Mil")
    assert r_dakar.status_code == 200
    dakar_data = r_dakar.json()
    assert 0 < dakar_data["kpis"]["total_observations"] < 4779
    assert dakar_data["kpis"]["regions_count"] == 1


def test_all_analytics_and_bulletin_endpoints():
    endpoints = [
        "/api/explorer?source=wfp&page=1&page_size=20",
        "/api/prices/analysis?source=wfp&commodity=Mil",
        "/api/prices/analysis?source=rt_model&commodity=Riz",
        "/api/products/analysis?source=wfp",
        "/api/geo/analysis?source=wfp&commodity=Riz%20(import%C3%A9)",
        "/api/geo/analysis?source=csa",
        "/api/temporal/analysis?source=wfp&commodity=Mil",
        "/api/markets/compare?source=wfp&commodity=Mil",
        "/api/stats/study?source=wfp&commodity=Mil",
        "/api/quality/audit",
    ]
    for url in endpoints:
        r = client.get(url)
        assert r.status_code == 200, f"Failed on {url}: {r.text}"

    bulletin_endpoints = [
        "/api/bulletin/csa",
        "/api/bulletin/commodities",
        "/api/bulletin/horticulture",
        "/api/bulletin/livestock",
        "/api/bulletin/senelec",
        "/api/bulletin/air-transport",
        "/api/bulletin/maritime-transport",
        "/api/bulletin/cross-analysis",
    ]
    for url in bulletin_endpoints:
        r = client.get(url)
        assert r.status_code == 200, f"Failed on {url}: {r.text}"
        b = r.json()
        assert b["available_in_2025_2026"] is False
        assert b["rows_2025_2026"] == 0


def test_exports_csv_excel_pdf():
    r_csv = client.get("/api/reports/export/csv?source=wfp&region=Dakar&commodity=Mil")
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]

    r_xls = client.get("/api/reports/export/excel?source=wfp&region=Dakar&commodity=Mil&horizon=3")
    assert r_xls.status_code == 200
    assert len(r_xls.content) > 2000

    r_pdf = client.post(
        "/api/reports/export/pdf",
        json={"source": "wfp", "commodity": "Mil", "region": "Dakar", "horizon": 3},
    )
    assert r_pdf.status_code == 200
    assert r_pdf.content[:4] == b"%PDF"

    for sheet in ["csa", "commodities", "horticulture", "livestock", "senelec", "air-transport", "maritime-transport"]:
        rs = client.get(f"/api/reports/export/bulletin/{sheet}")
        assert rs.status_code == 200, f"Bulletin export failed for {sheet}"


def test_rt_observed_and_csa_sources_2025_2026():
    r_rt_obs = client.get("/api/overview?source=rt_observed")
    assert r_rt_obs.status_code == 200
    d_obs = r_rt_obs.json()
    assert d_obs["meta"]["is_estimated"] is False
    assert d_obs["kpis"]["total_observations"] == 2070
    assert d_obs["meta"]["actual_min_date"] >= "2025-01-01"

    r_rt_mod = client.get("/api/overview?source=rt_model")
    assert r_rt_mod.status_code == 200
    d_mod = r_rt_mod.json()
    assert d_mod["meta"]["is_estimated"] is True
    assert d_mod["kpis"]["total_observations"] == 6528

    r_csa = client.get("/api/overview?source=csa")
    assert r_csa.status_code == 200
    d_csa = r_csa.json()
    assert d_csa["kpis"]["total_observations"] == 0
    assert d_csa["meta"]["empty_reason"] is not None


def test_spa_frontend_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "FOODPRICE SENEGAL" in r.text
    r_route = client.get("/forecast")
    assert r_route.status_code == 200
    assert "FOODPRICE SENEGAL" in r_route.text
