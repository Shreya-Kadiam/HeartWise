"""
HeartWise Model Proof & Classification Report Viewer
--------------------------------------------------
Run this file directly to prove all 3 models (Logistic Regression,
Random Forest, KNN) are trained and inspect their full classification reports:

    python backend/ml/show_classification_reports.py
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import CLASSIFICATION_REPORT_TXT_PATH, MODEL_BUNDLE_PATH
from ml.train_models import train_and_evaluate


def main():
    if not MODEL_BUNDLE_PATH.exists() or not CLASSIFICATION_REPORT_TXT_PATH.exists():
        print("Training models and generating classification reports...\n")
        train_and_evaluate()

    print(CLASSIFICATION_REPORT_TXT_PATH.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
