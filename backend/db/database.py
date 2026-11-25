"""
HeartWise Database Layer (SQLite)
Manages user accounts, authentication, saved health assessments across dates,
and longitudinal improvement analytics.
"""

import json
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

from config import DB_PATH


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        age INTEGER,
        sex TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        model_used TEXT NOT NULL,
        probability REAL NOT NULL,
        risk_tier TEXT NOT NULL,
        risk_level TEXT NOT NULL DEFAULT 'moderate',
        risk_summary TEXT NOT NULL DEFAULT '',
        input_data TEXT NOT NULL,
        explanation TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Seed a realistic demo user with 4 past dates showing measurable improvement
    cur.execute("SELECT id FROM users WHERE username = 'demo'")
    if not cur.fetchone():
        hashed = generate_password_hash("demo123")
        cur.execute("""
        INSERT INTO users (username, email, password_hash, full_name, age, sex)
        VALUES ('demo', 'demo@heartwise.app', ?, 'Alex Morgan', 46, 'Male')
        """, (hashed,))
        demo_id = cur.lastrowid

        from ml.ml_service import ml_service

        demo_timeline = [
            (
                "-60 days",
                {
                    "age": 46, "sex": "Male", "resting_bp_systolic": 144, "resting_bp_diastolic": 92,
                    "cholesterol_total": 242, "hdl": 42, "ldl": 158, "triglycerides": 195,
                    "fasting_blood_sugar": 114, "hba1c": 6.1, "bmi": 29.2, "resting_heart_rate": 84,
                    "max_heart_rate_achieved": 152, "chest_pain_type": "Atypical Angina",
                    "exercise_induced_angina": False, "st_depression": 1.4, "family_history": True,
                    "smoker_status": "Former", "alcohol_units_per_week": 11.0,
                    "exercise_minutes_per_week": 55, "sleep_hours": 5.8, "stress_score": 72.0,
                    "wearable_owner": True, "daily_steps": 4200, "diet_quality_score": 48.0
                }
            ),
            (
                "-38 days",
                {
                    "age": 46, "sex": "Male", "resting_bp_systolic": 136, "resting_bp_diastolic": 88,
                    "cholesterol_total": 224, "hdl": 46, "ldl": 142, "triglycerides": 172,
                    "fasting_blood_sugar": 106, "hba1c": 5.9, "bmi": 28.1, "resting_heart_rate": 79,
                    "max_heart_rate_achieved": 158, "chest_pain_type": "Non-Anginal Pain",
                    "exercise_induced_angina": False, "st_depression": 1.1, "family_history": True,
                    "smoker_status": "Former", "alcohol_units_per_week": 7.0,
                    "exercise_minutes_per_week": 105, "sleep_hours": 6.6, "stress_score": 56.0,
                    "wearable_owner": True, "daily_steps": 6300, "diet_quality_score": 62.0
                }
            ),
            (
                "-18 days",
                {
                    "age": 46, "sex": "Male", "resting_bp_systolic": 128, "resting_bp_diastolic": 82,
                    "cholesterol_total": 206, "hdl": 51, "ldl": 124, "triglycerides": 148,
                    "fasting_blood_sugar": 98, "hba1c": 5.6, "bmi": 26.8, "resting_heart_rate": 74,
                    "max_heart_rate_achieved": 164, "chest_pain_type": "Asymptomatic",
                    "exercise_induced_angina": False, "st_depression": 0.7, "family_history": True,
                    "smoker_status": "Former", "alcohol_units_per_week": 4.0,
                    "exercise_minutes_per_week": 145, "sleep_hours": 7.2, "stress_score": 44.0,
                    "wearable_owner": True, "daily_steps": 7900, "diet_quality_score": 74.0
                }
            ),
            (
                "-3 days",
                {
                    "age": 46, "sex": "Male", "resting_bp_systolic": 122, "resting_bp_diastolic": 78,
                    "cholesterol_total": 192, "hdl": 55, "ldl": 110, "triglycerides": 130,
                    "fasting_blood_sugar": 93, "hba1c": 5.4, "bmi": 25.6, "resting_heart_rate": 70,
                    "max_heart_rate_achieved": 168, "chest_pain_type": "Asymptomatic",
                    "exercise_induced_angina": False, "st_depression": 0.5, "family_history": True,
                    "smoker_status": "Former", "alcohol_units_per_week": 2.0,
                    "exercise_minutes_per_week": 175, "sleep_hours": 7.6, "stress_score": 34.0,
                    "wearable_owner": True, "daily_steps": 9100, "diet_quality_score": 82.0
                }
            ),
        ]

        for offset, sample in demo_timeline:
            pred = ml_service.predict(sample)
            cur.execute("""
            INSERT INTO assessments (
                user_id, model_used, probability, risk_tier, risk_level,
                risk_summary, input_data, explanation, recommendations, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
            """, (
                demo_id,
                pred["_internal_model_used"],
                pred["probability_percent"],
                pred["risk_tier"],
                pred["risk_level"],
                pred["risk_summary"],
                json.dumps(pred["input_data"]),
                json.dumps(pred["explanation"]),
                json.dumps(pred["recommendations"]),
                offset,
            ))

    conn.commit()
    conn.close()


def serialize_user(row) -> dict | None:
    if not row:
        return None
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "full_name": row["full_name"],
        "age": row["age"],
        "sex": row["sex"],
        "created_at": row["created_at"],
    }


def create_user(username, email, password, full_name, age=None, sex="Male"):
    conn = get_connection()
    cur = conn.cursor()
    hashed = generate_password_hash(password)
    try:
        cur.execute("""
        INSERT INTO users (username, email, password_hash, full_name, age, sex)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (username.strip().lower(), email.strip().lower(), hashed, full_name.strip(), age, sex))
        conn.commit()
        user_id = cur.lastrowid
        cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = serialize_user(cur.fetchone())
        return user, None
    except sqlite3.IntegrityError:
        return None, "An account with that username or email already exists."
    finally:
        conn.close()


def verify_user(identifier, password):
    """Allow login by username or email."""
    conn = get_connection()
    cur = conn.cursor()
    ident = identifier.strip().lower()
    cur.execute("SELECT * FROM users WHERE username = ? OR email = ?", (ident, ident))
    row = cur.fetchone()
    conn.close()
    if row and check_password_hash(row["password_hash"], password):
        return serialize_user(row)
    return None


def get_user_by_id(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return serialize_user(row)


def save_assessment(user_id, prediction: dict) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO assessments (
        user_id, model_used, probability, risk_tier, risk_level,
        risk_summary, input_data, explanation, recommendations
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        prediction.get("_internal_model_used", "Main Model"),
        float(prediction["probability_percent"]),
        prediction["risk_tier"],
        prediction["risk_level"],
        prediction["risk_summary"],
        json.dumps(prediction["input_data"]),
        json.dumps(prediction["explanation"]),
        json.dumps(prediction["recommendations"]),
    ))
    conn.commit()
    assessment_id = cur.lastrowid
    conn.close()
    return assessment_id


def delete_assessment(user_id: int, assessment_id: int) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM assessments WHERE id = ? AND user_id = ?", (assessment_id, user_id))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def _hydrate_assessment(r) -> dict:
    return {
        "id": r["id"],
        "probability_percent": round(float(r["probability"]), 1),
        "risk_tier": r["risk_tier"],
        "risk_level": r["risk_level"],
        "risk_summary": r["risk_summary"],
        "input_data": json.loads(r["input_data"]),
        "explanation": json.loads(r["explanation"]),
        "recommendations": json.loads(r["recommendations"]),
        "created_at": r["created_at"],
    }


def get_user_assessments_with_deltas(user_id: int) -> list[dict]:
    """
    Returns user assessments ordered newest-first, each annotated with
    `delta_vs_previous` (change in risk % compared to the immediately prior date).
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
    SELECT * FROM assessments
    WHERE user_id = ?
    ORDER BY created_at ASC, id ASC
    """, (user_id,))
    rows = cur.fetchall()
    conn.close()

    items = []
    prev_prob = None
    for r in rows:
        item = _hydrate_assessment(r)
        if prev_prob is None:
            item["delta_vs_previous"] = None
        else:
            item["delta_vs_previous"] = round(item["probability_percent"] - prev_prob, 1)
        prev_prob = item["probability_percent"]
        items.append(item)

    items.reverse()
    return items


def get_assessment_by_id(user_id: int, assessment_id: int) -> dict | None:
    items = get_user_assessments_with_deltas(user_id)
    for item in items:
        if item["id"] == assessment_id:
            return item
    return None


def get_dashboard_summary(user_id: int) -> dict:
    """
    Computes dashboard KPIs, timeline series for charts, and improvement metrics
    across previous assessment dates.
    """
    assessments_desc = get_user_assessments_with_deltas(user_id)
    assessments_asc = list(reversed(assessments_desc))

    timeline = []
    for item in assessments_asc:
        inp = item["input_data"]
        timeline.append({
            "id": item["id"],
            "date": item["created_at"][:10],
            "created_at": item["created_at"],
            "probability": item["probability_percent"],
            "risk_tier": item["risk_tier"],
            "risk_level": item["risk_level"],
            "systolic_bp": inp.get("resting_bp_systolic", 120),
            "diastolic_bp": inp.get("resting_bp_diastolic", 80),
            "cholesterol": inp.get("cholesterol_total", 185),
            "bmi": inp.get("bmi", 24.0),
            "daily_steps": inp.get("daily_steps", 7000),
            "exercise_minutes": inp.get("exercise_minutes_per_week", 150),
            "sleep_hours": inp.get("sleep_hours", 7.5),
            "stress_score": inp.get("stress_score", 35),
        })

    latest = assessments_desc[0] if assessments_desc else None
    previous = assessments_desc[1] if len(assessments_desc) > 1 else None
    first = assessments_asc[0] if assessments_asc else None

    change_since_last = None
    change_since_first = None
    if latest and previous:
        change_since_last = round(latest["probability_percent"] - previous["probability_percent"], 1)
    if latest and first and len(assessments_asc) > 1:
        change_since_first = round(latest["probability_percent"] - first["probability_percent"], 1)

    return {
        "total_assessments": len(assessments_desc),
        "latest": latest,
        "previous": previous,
        "change_since_last": change_since_last,
        "change_since_first": change_since_first,
        "timeline": timeline,
        "assessments": assessments_desc,
    }
