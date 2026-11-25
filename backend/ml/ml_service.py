"""
HeartWise Machine Learning Service
Uses ONLY the currently active main model (selected from model comparison / Model Lab)
to run heart disease risk predictions.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import (
    ACTIVE_MODEL_PATH,
    CLASSIFICATION_REPORT_JSON_PATH,
    CLASSIFICATION_REPORT_TXT_PATH,
    METRICS_JSON_PATH,
    MODEL_BUNDLE_PATH,
)
from ml.explainer import analyze_patient_risks
from ml.recommender import generate_recommendations

DEFAULTS = {
    "age": 45,
    "sex": "Male",
    "resting_bp_systolic": 120,
    "resting_bp_diastolic": 80,
    "cholesterol_total": 185,
    "hdl": 54,
    "ldl": 105,
    "triglycerides": 120,
    "fasting_blood_sugar": 92,
    "hba1c": 5.3,
    "bmi": 24.2,
    "resting_heart_rate": 70,
    "max_heart_rate_achieved": 165,
    "chest_pain_type": "Asymptomatic",
    "exercise_induced_angina": False,
    "st_depression": 0.4,
    "family_history": False,
    "smoker_status": "Never",
    "alcohol_units_per_week": 2.0,
    "exercise_minutes_per_week": 150,
    "sleep_hours": 7.5,
    "stress_score": 35.0,
    "wearable_owner": True,
    "daily_steps": 7500,
    "diet_quality_score": 72.0,
}

BOOL_COLS = {"exercise_induced_angina", "family_history", "wearable_owner"}
INT_COLS = {
    "age",
    "resting_bp_systolic",
    "resting_bp_diastolic",
    "cholesterol_total",
    "hdl",
    "ldl",
    "triglycerides",
    "fasting_blood_sugar",
    "resting_heart_rate",
    "max_heart_rate_achieved",
    "exercise_minutes_per_week",
    "daily_steps",
}
FLOAT_COLS = {
    "hba1c",
    "bmi",
    "st_depression",
    "alcohol_units_per_week",
    "sleep_hours",
    "stress_score",
    "diet_quality_score",
}


class MLService:
    def __init__(self):
        self.bundle = None
        self.metrics = None
        self.active_model_name = None
        self.load()

    def load(self):
        if not MODEL_BUNDLE_PATH.exists() or not METRICS_JSON_PATH.exists():
            from ml.train_models import train_and_evaluate
            train_and_evaluate()

        self.bundle = joblib.load(MODEL_BUNDLE_PATH)
        with open(METRICS_JSON_PATH, "r", encoding="utf-8") as f:
            self.metrics = json.load(f)

        if ACTIVE_MODEL_PATH.exists():
            with open(ACTIVE_MODEL_PATH, "r", encoding="utf-8") as f:
                active_cfg = json.load(f)
            chosen = active_cfg.get("active_model")
            if chosen in self.bundle["pipelines"]:
                self.active_model_name = chosen
            else:
                self.active_model_name = self.bundle["best_model_name"]
        else:
            self.active_model_name = self.bundle["best_model_name"]

    def get_active_model_name(self) -> str:
        if not self.active_model_name:
            self.load()
        return self.active_model_name

    def set_active_model(self, model_name: str) -> str:
        if not self.bundle:
            self.load()
        if model_name not in self.bundle["pipelines"]:
            raise ValueError(f"Unknown model: {model_name}")

        self.active_model_name = model_name
        payload = {
            "active_model": model_name,
            "auto_selected": self.bundle["best_model_name"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(ACTIVE_MODEL_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

        from ml.train_models import generate_comparison_html
        generate_comparison_html(self.metrics, model_name)
        return model_name

    def get_admin_metrics(self) -> dict:
        if not self.metrics:
            self.load()
        return {
            "active_model": self.get_active_model_name(),
            "metrics": self.metrics,
        }

    def get_classification_reports(self) -> dict:
        if not CLASSIFICATION_REPORT_JSON_PATH.exists() or not CLASSIFICATION_REPORT_TXT_PATH.exists():
            from ml.train_models import train_and_evaluate
            train_and_evaluate()
            self.load()

        with open(CLASSIFICATION_REPORT_JSON_PATH, "r", encoding="utf-8") as f:
            structured = json.load(f)
        raw_text = CLASSIFICATION_REPORT_TXT_PATH.read_text(encoding="utf-8")

        return {
            "active_model": self.get_active_model_name(),
            "report_file": str(CLASSIFICATION_REPORT_TXT_PATH),
            "structured": structured,
            "raw_text": raw_text,
        }

    def normalize_input(self, raw: dict) -> dict:
        if not self.bundle:
            self.load()

        bmi_val = raw.get("bmi")
        if (bmi_val is None or str(bmi_val).strip() == "") and raw.get("height_cm") and raw.get("weight_kg"):
            try:
                h_m = float(raw["height_cm"]) / 100.0
                w_kg = float(raw["weight_kg"])
                if h_m > 0:
                    bmi_val = round(w_kg / (h_m * h_m), 1)
            except (ValueError, TypeError):
                bmi_val = DEFAULTS["bmi"]

        diet_score = raw.get("diet_quality_score")
        if (diet_score is None or str(diet_score).strip() == "") and raw.get("eating_habits"):
            habit = str(raw["eating_habits"]).lower()
            if "heart" in habit or "healthy" in habit:
                diet_score = 88.0
            elif "balanced" in habit:
                diet_score = 72.0
            elif "average" in habit or "moderate" in habit:
                diet_score = 55.0
            else:
                diet_score = 35.0

        max_hr = raw.get("max_heart_rate_achieved")
        if max_hr is None or str(max_hr).strip() == "":
            try:
                age_val = int(float(raw.get("age", DEFAULTS["age"])))
                max_hr = max(100, min(210, 220 - age_val))
            except (ValueError, TypeError):
                max_hr = DEFAULTS["max_heart_rate_achieved"]

        clean = {}
        for col in self.bundle["feature_columns"]:
            val = raw.get(col)
            if col == "bmi" and bmi_val is not None and str(bmi_val).strip() != "":
                val = bmi_val
            elif col == "diet_quality_score" and diet_score is not None and str(diet_score).strip() != "":
                val = diet_score
            elif col == "max_heart_rate_achieved" and max_hr is not None and str(max_hr).strip() != "":
                val = max_hr
            elif val is None or str(val).strip() == "":
                val = DEFAULTS[col]

            if col in BOOL_COLS:
                if isinstance(val, str):
                    clean[col] = val.strip().lower() in {"true", "1", "yes", "y"}
                else:
                    clean[col] = bool(val)
            elif col in INT_COLS:
                clean[col] = int(round(float(val)))
            elif col in FLOAT_COLS:
                clean[col] = round(float(val), 2)
            else:
                clean[col] = str(val).strip()

        return clean

    def predict(self, raw_input: dict) -> dict:
        if not self.bundle:
            self.load()

        model_name = self.get_active_model_name()
        pipeline = self.bundle["pipelines"][model_name]

        clean_row = self.normalize_input(raw_input)
        df_input = pd.DataFrame([clean_row])

        prob = float(pipeline.predict_proba(df_input)[0, 1])
        percent = round(prob * 100.0, 1)

        if percent < 30.0:
            risk_tier = "Low Risk"
            risk_level = "low"
            risk_summary = (
                "Your predicted cardiovascular risk is low. Keep maintaining your healthy daily routine and preventive checkups."
            )
        elif percent < 65.0:
            risk_tier = "Moderate Risk"
            risk_level = "moderate"
            risk_summary = (
                "You have several modifiable cardiovascular risk indicators. Targeted lifestyle changes can meaningfully lower your risk."
            )
        else:
            risk_tier = "High Risk"
            risk_level = "high"
            risk_summary = (
                "Multiple elevated cardiovascular risk markers were detected. We recommend reviewing these results with a physician and starting preventive changes."
            )

        explanation = analyze_patient_risks(clean_row)
        recommendations = generate_recommendations(clean_row, risk_tier, percent)

        return {
            "probability_percent": percent,
            "risk_tier": risk_tier,
            "risk_level": risk_level,
            "risk_summary": risk_summary,
            "explanation": explanation,
            "recommendations": recommendations,
            "input_data": clean_row,
            "_internal_model_used": model_name,
        }


ml_service = MLService()
