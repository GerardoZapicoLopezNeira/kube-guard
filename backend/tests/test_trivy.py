# backend/tests/test_trivy.py
from app.services.trivy_service import get_trivy_reports

def test_get_reports_returns_list():
    reports = get_trivy_reports()
    assert isinstance(reports, list)
    assert len(reports) > 0
    assert hasattr(reports[0], "resource")