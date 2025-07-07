from fastapi import APIRouter, HTTPException
from app.services.offline_scan_service import scan_all_releases
from app.models.offline import OfflineScanResult
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/scan/all", response_model=List[OfflineScanResult], tags=["Offline Scan"])
def scan_all_helm_releases():
    try:
        logger.info("🧪 Starting full offline scan of all Helm releases.")
        return scan_all_releases()
    except Exception as e:
        logger.exception("🔥 Scan failed.")
        raise HTTPException(status_code=500, detail=str(e))
