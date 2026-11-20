from __future__ import annotations

from fastapi import APIRouter

from ..data_store import get_store
from ..i18n import fr_payload

router = APIRouter(prefix="/api/quality", tags=["Qualité des données"])


@router.get("/audit")
def api_quality_audit():
    store = get_store()
    return fr_payload(
        {
            "audit": store.audit_report,
            "manifest": store.manifest,
            "rt_empty_commodities": store.empty_rt_commodities,
        },
        skip_keys=("file", "columns", "sheet_raw", "rt_empty_commodities"),
    )
