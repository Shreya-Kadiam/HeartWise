"""
HeartWise Backend Configuration
Centralizes all directory and file paths across the backend.
"""

from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

DATA_PATH = PROJECT_ROOT / "data" / "heart_disease_risk_4000_rows.csv"
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
COMPARISON_HTML_PATH = PROJECT_ROOT / "model_comparison.html"

ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

REPORTS_DIR = BACKEND_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = BACKEND_DIR / "heartwise.db"

MODEL_BUNDLE_PATH = ARTIFACTS_DIR / "model_bundle.joblib"
METRICS_JSON_PATH = ARTIFACTS_DIR / "model_metrics.json"
ACTIVE_MODEL_PATH = ARTIFACTS_DIR / "active_model.json"

CLASSIFICATION_REPORT_TXT_PATH = REPORTS_DIR / "classification_reports.txt"
CLASSIFICATION_REPORT_JSON_PATH = REPORTS_DIR / "classification_reports.json"
