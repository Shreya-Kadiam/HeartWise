"""
HeartWise Flask Backend API
---------------------------
- User authentication (Register, Login, Demo Login, Token verification)
- Risk prediction using the active Main ML Model
- Personalized lifestyle suggestions based on predicted risk
- Dashboard analytics & previous date improvement history
- Model Lab / Admin endpoints: compare 3 models, view classification reports,
  switch the active prediction model live, or retrain all 3 models
- Serves the built React frontend from `../frontend/dist`
"""

import os
import sys
from functools import wraps
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import FRONTEND_DIST, PROJECT_ROOT
from db.database import (
    create_user,
    delete_assessment,
    get_assessment_by_id,
    get_dashboard_summary,
    get_user_by_id,
    init_db,
    save_assessment,
    verify_user,
)
from ml.ml_service import ml_service

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "heartwise-local-secret-key-2026")
CORS(app, resources={r"/api/*": {"origins": "*"}})

token_serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
TOKEN_MAX_AGE = 60 * 60 * 24 * 14  # 14 days

init_db()


def issue_token(user_id: int) -> str:
    return token_serializer.dumps({"user_id": user_id}, salt="heartwise-auth")


def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        data = token_serializer.loads(token, salt="heartwise-auth", max_age=TOKEN_MAX_AGE)
        return get_user_by_id(data["user_id"])
    except (BadSignature, SignatureExpired, KeyError):
        return None


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"status": "error", "message": "Authentication required."}), 401
        return fn(user, *args, **kwargs)
    return wrapper


# -----------------------------------------------------------------------------
# HEALTH & ACTIVE MODEL INFO
# -----------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({
        "status": "ok",
        "app": "HeartWise",
        "active_model": ml_service.get_active_model_name(),
    })


@app.route("/api/model-info", methods=["GET"])
def api_model_info():
    return jsonify({
        "status": "success",
        "active_model": ml_service.get_active_model_name(),
    })


# -----------------------------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# -----------------------------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(force=True) or {}
    full_name = str(data.get("full_name", "")).strip()
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", ""))
    age = data.get("age")
    sex = data.get("sex", "Male")

    if not full_name or not username or not email or not password:
        return jsonify({"status": "error", "message": "Please fill in all required fields."}), 400
    if len(password) < 6:
        return jsonify({"status": "error", "message": "Password must be at least 6 characters."}), 400

    try:
        age = int(age) if age not in (None, "") else None
    except (ValueError, TypeError):
        age = None

    user, err = create_user(username, email, password, full_name, age, sex)
    if err:
        return jsonify({"status": "error", "message": err}), 400

    return jsonify({
        "status": "success",
        "token": issue_token(user["id"]),
        "user": user,
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True) or {}
    identifier = str(data.get("username", "") or data.get("email", "")).strip()
    password = str(data.get("password", ""))

    if not identifier or not password:
        return jsonify({"status": "error", "message": "Please enter your username/email and password."}), 400

    user = verify_user(identifier, password)
    if not user:
        return jsonify({"status": "error", "message": "Invalid credentials. Please try again."}), 401

    return jsonify({
        "status": "success",
        "token": issue_token(user["id"]),
        "user": user,
    })


@app.route("/api/auth/demo", methods=["POST"])
def api_demo_login():
    user = verify_user("demo", "demo123")
    if not user:
        return jsonify({"status": "error", "message": "Demo account unavailable."}), 404
    return jsonify({
        "status": "success",
        "token": issue_token(user["id"]),
        "user": user,
    })


@app.route("/api/auth/me", methods=["GET"])
@auth_required
def api_me(user):
    return jsonify({"status": "success", "user": user})


# -----------------------------------------------------------------------------
# USER PREDICTION, DASHBOARD & HISTORY ENDPOINTS
# -----------------------------------------------------------------------------
@app.route("/api/predict", methods=["POST"])
@auth_required
def api_predict(user):
    payload = request.get_json(force=True) or {}
    try:
        prediction = ml_service.predict(payload)
        assessment_id = save_assessment(user["id"], prediction)
        saved = get_assessment_by_id(user["id"], assessment_id)

        return jsonify({
            "status": "success",
            "assessment": saved,
        }), 201
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Prediction failed: {exc}"}), 400


@app.route("/api/dashboard", methods=["GET"])
@auth_required
def api_dashboard(user):
    summary = get_dashboard_summary(user["id"])
    return jsonify({
        "status": "success",
        "dashboard": summary,
    })


@app.route("/api/assessments/<int:assessment_id>", methods=["GET", "DELETE"])
@auth_required
def api_assessment_detail(user, assessment_id):
    if request.method == "DELETE":
        deleted = delete_assessment(user["id"], assessment_id)
        if not deleted:
            return jsonify({"status": "error", "message": "Record not found."}), 404
        return jsonify({"status": "success"})

    item = get_assessment_by_id(user["id"], assessment_id)
    if not item:
        return jsonify({"status": "error", "message": "Record not found."}), 404
    return jsonify({"status": "success", "assessment": item})


# -----------------------------------------------------------------------------
# MODEL EVALUATION, CLASSIFICATION REPORTS & MODEL SWITCHER ENDPOINTS
# -----------------------------------------------------------------------------
@app.route("/api/admin/models", methods=["GET"])
def api_admin_models():
    data = ml_service.get_admin_metrics()
    return jsonify({"status": "success", **data})


@app.route("/api/admin/reports", methods=["GET"])
def api_admin_reports():
    reports = ml_service.get_classification_reports()
    return jsonify({"status": "success", **reports})


@app.route("/api/admin/select-model", methods=["POST"])
def api_admin_select_model():
    body = request.get_json(force=True) or {}
    model_name = body.get("model_name")
    try:
        active = ml_service.set_active_model(model_name)
        return jsonify({"status": "success", "active_model": active})
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@app.route("/api/admin/retrain", methods=["POST"])
def api_admin_retrain():
    try:
        from ml.train_models import train_and_evaluate
        metrics, best_name = train_and_evaluate()
        ml_service.load()
        return jsonify({
            "status": "success",
            "active_model": best_name,
            "metrics": metrics,
        })
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/model-comparison")
def serve_model_comparison():
    return send_from_directory(PROJECT_ROOT, "model_comparison.html")


# -----------------------------------------------------------------------------
# SERVE BUILT REACT FRONTEND
# -----------------------------------------------------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"status": "error", "message": "Endpoint not found."}), 404
    if FRONTEND_DIST.exists():
        target = FRONTEND_DIST / path
        if path and target.is_file():
            return send_from_directory(FRONTEND_DIST, path)
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({
        "status": "info",
        "message": "Frontend build not found. Run 'npm run build' in frontend/ or start Vite dev server.",
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"HeartWise running on http://127.0.0.1:{port}")
    print(f"Model Comparison page: http://127.0.0.1:{port}/model-comparison")
    app.run(host="127.0.0.1", port=port, debug=False)
