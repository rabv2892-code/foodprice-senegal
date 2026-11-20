"""Vérification : parcourt toutes les routes de l'API et signale les chaînes visibles qui semblent anglaises."""
import json
import re
import sys

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

EN = re.compile(
    r"\b(the|and|of|with|for|price|prices|observed|forecast|model|real-time|food|average|mean|latest|dashboard|report|summary|retail|"
    r"source|period|market|markets|commodity|region|year|month|actual|estimate|estimated|evaluated|unavailable|warning|"
    r"yoy|mom|iqr|ohlc|kpi|rmse|mae|mape|skew\w*|kurt\w*|boxplot\w*|wfp|close|open|high|low|trust|inflation|rows|total|std|median|"
    r"imported|local|shelled|unshelled|rice|millet|maize|sorghum|beans|groundnuts|cereals|pulses|nuts|tubers)\b",
    re.I,
)
SKIP_KEYS = {"id", "source", "stage_col", "status", "currency", "period_group", "model", "boxplots_group_by", "table_code"}

calls = [
    ("GET", "/api/health"),
    ("GET", "/api/filters?source=wfp"),
    ("GET", "/api/filters?source=rt_observed"),
    ("GET", "/api/filters?source=rt_model"),
    ("GET", "/api/executive/dashboard?source=wfp"),
    ("GET", "/api/executive/dashboard?source=rt_model"),
    ("GET", "/api/executive/dashboard?source=rt_observed"),
    ("GET", "/api/executive/dashboard?source=csa"),
    ("GET", "/api/overview?source=wfp"),
    ("GET", "/api/overview?source=rt_model"),
    ("GET", "/api/explorer?source=wfp&page=1&page_size=5"),
    ("GET", "/api/explorer?source=rt_model&page=1&page_size=5"),
    ("GET", "/api/prices/analysis?source=wfp"),
    ("GET", "/api/prices/analysis?source=rt_model"),
    ("GET", "/api/products/analysis?source=wfp"),
    ("GET", "/api/geo/analysis?source=wfp"),
    ("GET", "/api/temporal/analysis?source=wfp"),
    ("GET", "/api/markets/compare?source=wfp"),
    ("GET", "/api/stats/study?source=wfp"),
    ("GET", "/api/stats/study?source=rt_observed"),
    ("GET", "/api/forecast/options?source=wfp"),
    ("POST", "/api/forecast/run", {"source": "wfp", "commodity": "Mil", "region": "Dakar", "market": "ALL", "horizon": 6}),
    ("POST", "/api/forecast/run", {"source": "wfp", "commodity": "Sorgho", "region": "Dakar", "market": "ALL", "horizon": 6}),
    ("POST", "/api/forecast/run", {"source": "rt_model", "commodity": "Riz", "region": "ALL", "market": "ALL", "horizon": 12}),
    ("GET", "/api/quality/audit"),
    ("GET", "/api/bulletin/csa"),
    ("GET", "/api/bulletin/commodities"),
    ("GET", "/api/bulletin/horticulture"),
    ("GET", "/api/bulletin/livestock"),
    ("GET", "/api/bulletin/senelec"),
    ("GET", "/api/bulletin/air-transport"),
    ("GET", "/api/bulletin/maritime-transport"),
]

found: dict[str, set[str]] = {}


def walk(path: str, key: str, val):
    if isinstance(val, dict):
        for k, v in val.items():
            walk(path, k, v)
    elif isinstance(val, list):
        for v in val[:400]:
            walk(path, key, v)
    elif isinstance(val, str):
        if key in SKIP_KEYS:
            return
        if EN.search(val) and not re.fullmatch(r"[\w\-. ]+\.(csv|xlsx)", val):
            found.setdefault(path, set()).add(f"[{key}] {val[:140]}")


for c in calls:
    method, url = c[0], c[1]
    r = client.get(url) if method == "GET" else client.post(url, json=c[2])
    if r.status_code != 200:
        print("STATUS", r.status_code, url)
        continue
    walk(url, "", r.json())

for p, items in found.items():
    print("==", p)
    for i in sorted(items)[:25]:
        print("   ", i)
print("TOTAL routes with suspect strings:", len(found))
