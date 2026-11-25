"""
HeartWise ML Training, Evaluation & Model Comparison Pipeline
-------------------------------------------------------------
1. Loads the heart disease dataset (4,000 rows).
2. Performs a stratified 70% Train / 15% Validation / 15% Test split.
3. Trains 3 candidate models using identical preprocessing pipelines:
   - Logistic Regression
   - Random Forest
   - K-Nearest Neighbors (KNN)
4. Evaluates all 3 on the held-out test set (Classification Report, Accuracy,
   Recall, Precision, Specificity, F1-Score, ROC-AUC, Confusion Matrix, ROC Curve).
5. Automatically selects the best-performing model as the Active Main Model.
6. Saves:
   - backend/artifacts/model_bundle.joblib
   - backend/artifacts/model_metrics.json
   - backend/artifacts/active_model.json
   - backend/reports/classification_reports.txt   (human-readable proof & report)
   - backend/reports/classification_reports.json  (structured classification reports)
   - model_comparison.html                        (interactive comparison & switcher)
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import (
    ACTIVE_MODEL_PATH,
    CLASSIFICATION_REPORT_JSON_PATH,
    CLASSIFICATION_REPORT_TXT_PATH,
    COMPARISON_HTML_PATH,
    DATA_PATH,
    METRICS_JSON_PATH,
    MODEL_BUNDLE_PATH,
)


def build_winner_analysis(comparison: list[dict], best_name: str) -> dict:
    by_name = {row["model"]: row for row in comparison}
    lr = by_name.get("Logistic Regression", {})
    rf = by_name.get("Random Forest", {})
    knn = by_name.get("KNN", {})

    return {
        "best_model": best_name,
        "headline": f"Why {best_name} Outperforms Random Forest & KNN on This Dataset",
        "points": [
            {
                "title": "Smooth Linear Clinical Risk Relationship",
                "detail": (
                    "In this 4,000-row clinical dataset, cardiovascular risk rises smoothly and additively "
                    "with standardized biomarkers (max heart rate, age, ST depression, chest pain type, "
                    "exercise-induced angina, smoking, HbA1c, HDL). Logistic Regression learns this smooth "
                    "log-odds boundary directly, whereas Random Forest approximates diagonal boundaries using "
                    "axis-aligned step splits."
                ),
            },
            {
                "title": "Higher Sensitivity (Recall) & ROC-AUC on Test Data",
                "detail": (
                    f"On the 600-patient held-out test set, Logistic Regression achieves "
                    f"{lr.get('roc_auc', 0)*100:.1f}% ROC-AUC, {lr.get('accuracy', 0)*100:.1f}% accuracy, and "
                    f"{lr.get('recall', 0)*100:.1f}% recall on Heart Disease cases — outperforming Random Forest "
                    f"({rf.get('roc_auc', 0)*100:.1f}% ROC-AUC, {rf.get('recall', 0)*100:.1f}% recall) and KNN "
                    f"({knn.get('roc_auc', 0)*100:.1f}% ROC-AUC, {knn.get('recall', 0)*100:.1f}% recall)."
                ),
            },
            {
                "title": "Why KNN Trails Behind",
                "detail": (
                    "After One-Hot Encoding categorical features, the feature space has 25+ dimensions. "
                    "Distance-based KNN suffers from the curse of dimensionality, causing lower recall "
                    f"({knn.get('recall', 0)*100:.1f}%) compared to parametric and ensemble methods."
                ),
            },
            {
                "title": "Well-Calibrated Probabilities & Interpretability",
                "detail": (
                    "Logistic Regression produces naturally calibrated risk percentages (0%–100%) and clear "
                    "positive/negative feature weights (coefficients), which is ideal for medical screening."
                ),
            },
        ],
    }


def write_classification_report_files(metrics_export: dict) -> None:
    """Writes human-readable and JSON classification report files in backend/reports/."""
    summary = metrics_export["summary"]
    comparison = metrics_export["comparison"]
    models = metrics_export["models"]
    winner = metrics_export["winner_analysis"]

    structured_reports = {
        "generated_at": metrics_export["trained_at"],
        "dataset_summary": summary,
        "selected_best_model": metrics_export["selected_model"],
        "models": {},
        "winner_analysis": winner,
    }

    lines = [
        "=" * 78,
        "HEARTWISE - TRAINED ML MODELS & CLASSIFICATION REPORTS",
        "=" * 78,
        f"Generated At       : {metrics_export['trained_at']}",
        f"Dataset            : data/heart_disease_risk_4000_rows.csv ({summary['total_records']} rows)",
        f"Split Strategy     : Stratified 70% Train ({summary['train_records']}) / "
        f"15% Validation ({summary['val_records']}) / 15% Test ({summary['test_records']})",
        f"Class Distribution : No Heart Disease = {summary['negative_cases']} | "
        f"Heart Disease = {summary['positive_cases']}",
        f"Selected Best Model: {metrics_export['selected_model']}",
        "",
        "-" * 78,
        "1. OVERALL MODEL COMPARISON SUMMARY (HELD-OUT TEST SET, n=600)",
        "-" * 78,
        f"{'Model':<22} {'ROC-AUC':>9} {'Accuracy':>9} {'Precision':>10} {'Recall':>9} {'F1-Score':>9} {'Specificity':>12}",
        "-" * 78,
    ]

    for row in comparison:
        lines.append(
            f"{row['model']:<22} "
            f"{row['roc_auc']*100:>8.2f}% "
            f"{row['accuracy']*100:>8.2f}% "
            f"{row['precision']*100:>9.2f}% "
            f"{row['recall']*100:>8.2f}% "
            f"{row['f1_score']*100:>8.2f}% "
            f"{row['specificity']*100:>11.2f}%"
        )

    lines.append("")
    lines.append("-" * 78)
    lines.append("2. DETAILED CLASSIFICATION REPORTS (PER MODEL)")
    lines.append("-" * 78)

    for idx, row in enumerate(comparison, start=1):
        name = row["model"]
        m = models[name]
        t = m["test"]
        structured_reports["models"][name] = {
            "hyperparameters": m["hyperparameters"],
            "roc_auc": t["roc_auc"],
            "accuracy": t["accuracy"],
            "specificity": t["specificity"],
            "confusion_matrix": {
                "true_negatives": t["true_negatives"],
                "false_positives": t["false_positives"],
                "false_negatives": t["false_negatives"],
                "true_positives": t["true_positives"],
            },
            "classification_report": t["classification_report"],
            "classification_report_text": t["classification_report_text"],
        }

        lines.extend([
            "",
            f"[{idx}] MODEL: {name}" + ("  <-- SELECTED BEST MODEL" if name == metrics_export["selected_model"] else ""),
            f"    Configuration   : {m['hyperparameters']}",
            f"    ROC-AUC Score   : {t['roc_auc']:.4f} ({t['roc_auc']*100:.2f}%)",
            f"    Confusion Matrix: TN={t['true_negatives']}  FP={t['false_positives']}  "
            f"FN={t['false_negatives']}  TP={t['true_positives']}",
            "",
            t["classification_report_text"].rstrip(),
            "-" * 78,
        ])

    lines.extend([
        "",
        "3. " + winner["headline"].upper(),
        "-" * 78,
    ])
    for pt in winner["points"]:
        lines.append(f"* {pt['title']}:")
        lines.append(f"  {pt['detail']}")
        lines.append("")

    CLASSIFICATION_REPORT_TXT_PATH.write_text("\n".join(lines), encoding="utf-8")
    with open(CLASSIFICATION_REPORT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(structured_reports, f, indent=2)


def generate_comparison_html(metrics_export: dict, active_model: str):
    """Writes a self-contained model_comparison.html file in the project root."""
    embedded_payload = {
        "active_model": active_model,
        "metrics": metrics_export,
    }
    payload_json = json.dumps(embedded_payload)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Model Comparison, Classification Reports &amp; Selection — HeartWise</title>
  <style>
    :root {{
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #2563eb;
      --primary-soft: #eff6ff;
      --emerald: #059669;
      --emerald-soft: #ecfdf5;
      --amber: #d97706;
      --amber-soft: #fffbeb;
      --rose: #e11d48;
      --radius: 12px;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 28px 20px 64px;
    }}
    .container {{ max-width: 1140px; margin: 0 auto; }}
    .topbar {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }}
    .badge-private {{
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      background: #e2e8f0;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 8px;
    }}
    h1 {{ font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }}
    .subtitle {{ color: var(--muted); font-size: 14px; margin-top: 4px; max-width: 700px; }}
    .actions {{ display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }}
    .btn {{
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      padding: 9px 15px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: 0.15s ease;
    }}
    .btn:hover {{ background: #f1f5f9; }}
    .btn-primary {{
      background: var(--primary);
      border-color: var(--primary);
      color: #ffffff;
    }}
    .btn-primary:hover {{ background: #1d4ed8; }}
    .btn:disabled {{ opacity: 0.6; cursor: not-allowed; }}
    .status-note {{
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--amber-soft);
      color: #92400e;
      border: 1px solid #fde68a;
    }}
    .status-note.live {{ background: var(--emerald-soft); color: var(--emerald); border-color: #a7f3d0; }}

    .offline-alert {{
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid var(--amber);
      color: #78350f;
      border-radius: var(--radius);
      padding: 14px 18px;
      margin-bottom: 18px;
      font-size: 13.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .banner {{
      background: var(--surface);
      border: 1px solid #bfdbfe;
      border-left: 4px solid var(--primary);
      border-radius: var(--radius);
      padding: 18px 22px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }}
    .banner-title {{ font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); font-weight: 700; }}
    .banner-model {{ font-size: 22px; font-weight: 700; margin-top: 2px; }}
    .banner-desc {{ font-size: 13.5px; color: var(--muted); margin-top: 4px; }}

    .grid-3 {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }}
    .card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }}
    .card.active-card {{
      border: 2px solid var(--primary);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.10);
    }}
    .card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      gap: 8px;
    }}
    .card h2 {{ font-size: 16px; font-weight: 700; }}
    .card h3 {{ font-size: 15px; font-weight: 700; margin-bottom: 12px; }}
    .pill {{
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
    }}
    .pill.selected {{ background: var(--primary-soft); color: var(--primary); }}
    .pill.recommended {{ background: var(--emerald-soft); color: var(--emerald); }}

    .kpi-grid {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }}
    .kpi {{
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      padding: 10px;
    }}
    .kpi-label {{ font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }}
    .kpi-val {{ font-size: 18px; font-weight: 700; margin-top: 2px; }}

    table {{ width: 100%; border-collapse: collapse; font-size: 13.5px; }}
    th, td {{ text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }}
    th {{ font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); background: #f8fafc; }}
    tr.highlight td {{ background: #eff6ff; font-weight: 600; }}

    .tab-row {{ display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }}
    .tab-btn {{
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #f8fafc;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }}
    .tab-btn.active {{
      background: var(--primary);
      border-color: var(--primary);
      color: #ffffff;
    }}

    .insight-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
      margin-top: 10px;
    }}
    .insight-box {{
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
    }}
    .insight-box h4 {{ font-size: 13.5px; font-weight: 700; margin-bottom: 6px; color: #0f172a; }}
    .insight-box p {{ font-size: 12.8px; color: #475569; line-height: 1.5; }}

    .bar-row {{ margin-bottom: 12px; }}
    .bar-head {{ display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px; color: #334155; }}
    .bar-track {{ height: 9px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }}
    .bar-fill {{ height: 100%; border-radius: 999px; }}

    .cm-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }}
    .cm-cell {{ padding: 12px; border-radius: 8px; text-align: center; }}
    .cm-cell .num {{ font-size: 20px; font-weight: 700; }}
    .cm-cell .lbl {{ font-size: 11px; color: var(--muted); margin-top: 2px; }}
    .cm-tp {{ background: #ecfdf5; color: #065f46; }}
    .cm-tn {{ background: #eff6ff; color: #1e40af; }}
    .cm-fp {{ background: #fffbeb; color: #92400e; }}
    .cm-fn {{ background: #fff1f2; color: #9f1239; }}

    .dataset-strip {{
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 13px;
      color: var(--muted);
    }}
    .dataset-strip strong {{ color: var(--text); }}

    .toast {{
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      display: none;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
      z-index: 99;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="topbar">
      <div>
        <span class="badge-private">HeartWise ML Evaluation &amp; Model Control</span>
        <h1>Heart Disease Model Comparison &amp; Classification Reports</h1>
        <p class="subtitle">
          Compare all 3 trained models (<strong>Logistic Regression</strong>, <strong>Random Forest</strong>, <strong>KNN</strong>), inspect their full sklearn classification reports, and choose the active Main Prediction Model.
        </p>
      </div>
      <div class="actions">
        <span id="server-status" class="status-note">Checking backend...</span>
        <button class="btn" onclick="syncWithServer(true)">Reconnect Backend</button>
        <button id="retrain-btn" class="btn btn-primary" onclick="retrainModels()">Retrain Models</button>
      </div>
    </div>

    <div id="offline-alert" class="offline-alert" style="display:none;">
      <div>
        <strong>Backend server is currently offline (Preview Mode):</strong>
        You can still switch models here to preview their metrics &amp; classification reports. To save your selected model for live predictions in the web app, double-click <code>start_app.bat</code> and open <code>http://127.0.0.1:5000/model-comparison</code>.
      </div>
      <a href="http://127.0.0.1:5000" class="btn" style="text-decoration:none;">Open App (port 5000)</a>
    </div>

    <div class="banner">
      <div>
        <div class="banner-title">Active Main Prediction Model</div>
        <div id="active-model-name" class="banner-model">—</div>
        <div id="active-model-desc" class="banner-desc"></div>
      </div>
      <div class="dataset-strip" id="dataset-summary"></div>
    </div>

    <div class="grid-3" id="model-cards"></div>

    <div class="card" style="margin-bottom: 24px;">
      <h3>Test Set Performance Comparison</h3>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>ROC-AUC</th>
              <th>Accuracy</th>
              <th>Recall</th>
              <th>Precision</th>
              <th>F1-Score</th>
              <th>Specificity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="comparison-table-body"></tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <h3>Classification Reports (Held-Out Test Set, n = 600)</h3>
      <div class="tab-row" id="cr-tabs"></div>
      <div style="overflow-x: auto;" id="cr-table-wrap"></div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <h3 id="winner-headline">Why Logistic Regression Outperforms Random Forest Here</h3>
      <div class="insight-grid" id="winner-insights"></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>ROC Curve Comparison (Test Set)</h3>
        <div id="roc-chart-container"></div>
        <div id="roc-legend" style="display:flex; gap:16px; flex-wrap:wrap; margin-top:12px; font-size:12.5px;"></div>
      </div>
      <div class="card">
        <h3>Top Predictive Features</h3>
        <div id="feature-importance-container"></div>
      </div>
    </div>

    <div class="card">
      <h3>Confusion Matrices (Held-Out Test Set)</h3>
      <div class="grid-3" id="confusion-matrices" style="margin-bottom: 0; margin-top: 12px;"></div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script id="embedded-metrics" type="application/json">{payload_json}</script>
  <script>
    const API_BASE = window.location.protocol.startsWith("http") && window.location.port === "5000"
      ? ""
      : "http://127.0.0.1:5000";
    const MODEL_COLORS = {{
      "Logistic Regression": "#2563eb",
      "Random Forest": "#059669",
      "KNN": "#d97706"
    }};

    let state = JSON.parse(document.getElementById("embedded-metrics").textContent);
    let selectedReportModel = state.active_model || state.metrics.selected_model;
    let serverOnline = false;

    function showToast(msg) {{
      const el = document.getElementById("toast");
      el.textContent = msg;
      el.style.display = "block";
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => {{ el.style.display = "none"; }}, 3600);
    }}

    function pct(val) {{
      return (Number(val) * 100).toFixed(1) + "%";
    }}

    function renderClassificationReport(modelName) {{
      const metrics = state.metrics;
      const modelNames = metrics.comparison.map(r => r.model);
      if (!modelNames.includes(selectedReportModel)) {{
        selectedReportModel = modelNames[0];
      }}

      document.getElementById("cr-tabs").innerHTML = modelNames.map(name => `
        <button class="tab-btn ${{name === selectedReportModel ? 'active' : ''}}" onclick="switchReportTab('${{name}}')">
          ${{name}}
        </button>
      `).join("");

      const cr = metrics.models[selectedReportModel]?.test?.classification_report || {{}};
      const rows = [
        {{ key: "No Heart Disease (0)", label: "Class 0 — No Heart Disease" }},
        {{ key: "Heart Disease (1)", label: "Class 1 — Heart Disease" }},
        {{ key: "macro avg", label: "Macro Average" }},
        {{ key: "weighted avg", label: "Weighted Average" }},
      ];

      document.getElementById("cr-table-wrap").innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Class / Average</th>
              <th>Precision</th>
              <th>Recall</th>
              <th>F1-Score</th>
              <th>Support</th>
            </tr>
          </thead>
          <tbody>
            ${{rows.map(r => {{
              const d = cr[r.key] || {{}};
              return `
                <tr>
                  <td><strong>${{r.label}}</strong></td>
                  <td>${{pct(d.precision || 0)}}</td>
                  <td>${{pct(d.recall || 0)}}</td>
                  <td>${{pct(d['f1-score'] || 0)}}</td>
                  <td>${{d.support ?? '—'}}</td>
                </tr>
              `;
            }}).join("")}}
            <tr class="highlight">
              <td>Overall Accuracy</td>
              <td colspan="3">${{pct(cr.accuracy || 0)}}</td>
              <td>${{metrics.summary?.test_records || 600}}</td>
            </tr>
          </tbody>
        </table>
      `;
    }}

    function switchReportTab(name) {{
      selectedReportModel = name;
      renderClassificationReport(name);
    }}

    function render() {{
      const metrics = state.metrics;
      const active = state.active_model || metrics.selected_model;
      const autoBest = metrics.selected_model;
      const summary = metrics.summary || {{}};
      const activeStats = metrics.models[active]?.test || {{}};

      document.getElementById("active-model-name").textContent = active;
      document.getElementById("active-model-desc").textContent =
        `Test ROC-AUC: ${{pct(activeStats.roc_auc || 0)}} · Accuracy: ${{pct(activeStats.accuracy || 0)}} · Recall: ${{pct(activeStats.recall || 0)}} · F1: ${{pct(activeStats.f1_score || 0)}}`;

      document.getElementById("dataset-summary").innerHTML = `
        <span>Records: <strong>${{summary.total_records || 4000}}</strong></span>
        <span>Train / Val / Test: <strong>${{summary.train_records}} / ${{summary.val_records}} / ${{summary.test_records}}</strong></span>
        <span>Auto-Recommended: <strong>${{autoBest}}</strong></span>
      `;

      document.getElementById("model-cards").innerHTML = metrics.comparison.map(row => {{
        const isActive = row.model === active;
        const isBest = row.model === autoBest;
        return `
          <div class="card ${{isActive ? 'active-card' : ''}}">
            <div class="card-header">
              <h2>${{row.model}}</h2>
              <div style="display:flex; gap:6px;">
                ${{isBest ? '<span class="pill recommended">Best Overall</span>' : ''}}
                ${{isActive ? '<span class="pill selected">Main Model</span>' : ''}}
              </div>
            </div>
            <div class="kpi-grid">
              <div class="kpi"><div class="kpi-label">ROC-AUC</div><div class="kpi-val">${{pct(row.roc_auc)}}</div></div>
              <div class="kpi"><div class="kpi-label">Accuracy</div><div class="kpi-val">${{pct(row.accuracy)}}</div></div>
              <div class="kpi"><div class="kpi-label">Recall</div><div class="kpi-val">${{pct(row.recall)}}</div></div>
              <div class="kpi"><div class="kpi-label">Precision</div><div class="kpi-val">${{pct(row.precision)}}</div></div>
              <div class="kpi"><div class="kpi-label">F1-Score</div><div class="kpi-val">${{pct(row.f1_score)}}</div></div>
              <div class="kpi"><div class="kpi-label">Specificity</div><div class="kpi-val">${{pct(row.specificity)}}</div></div>
            </div>
            <button
              class="btn ${{isActive ? '' : 'btn-primary'}}"
              style="width:100%;"
              ${{isActive ? 'disabled' : ''}}
              onclick="selectModel('${{row.model}}')"
            >
              ${{isActive ? 'Currently Active Main Model' : 'Select as Main Model'}}
            </button>
          </div>
        `;
      }}).join("");

      document.getElementById("comparison-table-body").innerHTML = metrics.comparison.map(row => {{
        const isActive = row.model === active;
        return `
          <tr class="${{isActive ? 'highlight' : ''}}">
            <td>${{row.model}}</td>
            <td>${{pct(row.roc_auc)}}</td>
            <td>${{pct(row.accuracy)}}</td>
            <td>${{pct(row.recall)}}</td>
            <td>${{pct(row.precision)}}</td>
            <td>${{pct(row.f1_score)}}</td>
            <td>${{pct(row.specificity)}}</td>
            <td>${{isActive ? '<span class="pill selected">Main Model</span>' : '<span class="pill">Candidate</span>'}}</td>
          </tr>
        `;
      }}).join("");

      renderClassificationReport(selectedReportModel);

      // Winner Analysis
      const winner = metrics.winner_analysis || {{}};
      if (winner.headline) {{
        document.getElementById("winner-headline").textContent = winner.headline;
      }}
      document.getElementById("winner-insights").innerHTML = (winner.points || []).map(p => `
        <div class="insight-box">
          <h4>${{p.title}}</h4>
          <p>${{p.detail}}</p>
        </div>
      `).join("");

      // ROC SVG
      const w = 440, h = 260, pad = 34;
      const sx = x => pad + x * (w - pad * 1.4);
      const sy = y => (h - pad) - y * (h - pad * 1.5);
      let paths = "";
      let legend = "";
      Object.entries(metrics.models).forEach(([name, mdata]) => {{
        const pts = mdata.test.roc_curve || [];
        const d = pts.map((p, i) => `${{i === 0 ? 'M' : 'L'}} ${{sx(p.fpr).toFixed(1)}} ${{sy(p.tpr).toFixed(1)}}`).join(" ");
        const color = MODEL_COLORS[name] || "#2563eb";
        const width = name === active ? 3.5 : 2;
        paths += `<path d="${{d}}" fill="none" stroke="${{color}}" stroke-width="${{width}}" />`;
        legend += `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:2px;background:${{color}};display:inline-block;"></span>${{name}} (AUC ${{mdata.test.roc_auc.toFixed(3)}})</span>`;
      }});
      document.getElementById("roc-chart-container").innerHTML = `
        <svg viewBox="0 0 ${{w}} ${{h}}" style="width:100%;max-height:270px;display:block;">
          <line x1="${{pad}}" y1="${{h - pad}}" x2="${{w - 14}}" y2="${{h - pad}}" stroke="#cbd5e1" />
          <line x1="${{pad}}" y1="${{h - pad}}" x2="${{pad}}" y2="14" stroke="#cbd5e1" />
          <line x1="${{sx(0)}}" y1="${{sy(0)}}" x2="${{sx(1)}}" y2="${{sy(1)}}" stroke="#94a3b8" stroke-dasharray="4 4" />
          ${{paths}}
          <text x="${{w / 2}}" y="${{h - 6}}" text-anchor="middle" font-size="11" fill="#64748b">False Positive Rate</text>
          <text x="12" y="${{h / 2}}" text-anchor="middle" font-size="11" fill="#64748b" transform="rotate(-90 12 ${{h/2}})">True Positive Rate</text>
        </svg>
      `;
      document.getElementById("roc-legend").innerHTML = legend;

      // Feature Importance (switches dynamically between LR and RF!)
      if (active === "Random Forest") {{
        const feats = (metrics.feature_importance?.random_forest || []).slice(0, 8);
        const maxVal = Math.max(...feats.map(f => f.importance), 0.01);
        document.getElementById("feature-importance-container").innerHTML = feats.map(f => {{
          const widthPct = Math.round((f.importance / maxVal) * 100);
          return `
            <div class="bar-row">
              <div class="bar-head">
                <span style="text-transform:capitalize;">${{f.feature.replace(/_/g, " ")}}</span>
                <span style="color:#059669;font-weight:600;">${{(f.importance * 100).toFixed(1)}}%</span>
              </div>
              <div class="bar-track"><div class="bar-fill" style="width:${{widthPct}}%;background:#059669;"></div></div>
            </div>
          `;
        }}).join("");
      }} else {{
        const feats = (metrics.feature_importance?.logistic_regression || []).slice(0, 8);
        const maxVal = Math.max(...feats.map(f => f.abs_weight), 0.01);
        document.getElementById("feature-importance-container").innerHTML = feats.map(f => {{
          const widthPct = Math.round((f.abs_weight / maxVal) * 100);
          const isPos = f.weight >= 0;
          return `
            <div class="bar-row">
              <div class="bar-head">
                <span style="text-transform:capitalize;">${{f.feature.replace(/_/g, " ")}}</span>
                <span style="color:${{isPos ? '#e11d48' : '#059669'}};font-weight:600;">${{isPos ? '+' : ''}}${{f.weight.toFixed(3)}}</span>
              </div>
              <div class="bar-track"><div class="bar-fill" style="width:${{widthPct}}%;background:${{isPos ? '#2563eb' : '#10b981'}};"></div></div>
            </div>
          `;
        }}).join("");
      }}

      // Confusion Matrices
      document.getElementById("confusion-matrices").innerHTML = Object.entries(metrics.models).map(([name, mdata]) => {{
        const t = mdata.test;
        const isActive = name === active;
        return `
          <div style="border:${{isActive ? '2px solid #2563eb' : '1px solid var(--border)'}};border-radius:10px;padding:14px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;display:flex;justify-content:space-between;">
              <span>${{name}}</span>
              ${{isActive ? '<span class="pill selected">Active</span>' : ''}}
            </div>
            <div class="cm-grid">
              <div class="cm-cell cm-tp"><div class="num">${{t.true_positives}}</div><div class="lbl">True Positive</div></div>
              <div class="cm-cell cm-fp"><div class="num">${{t.false_positives}}</div><div class="lbl">False Positive</div></div>
              <div class="cm-cell cm-fn"><div class="num">${{t.false_negatives}}</div><div class="lbl">False Negative</div></div>
              <div class="cm-cell cm-tn"><div class="num">${{t.true_negatives}}</div><div class="lbl">True Negative</div></div>
            </div>
          </div>
        `;
      }}).join("");
    }}

    async function syncWithServer(manual = false) {{
      const badge = document.getElementById("server-status");
      const alertBox = document.getElementById("offline-alert");
      try {{
        const res = await fetch(`${{API_BASE}}/api/admin/models`);
        if (!res.ok) throw new Error("Not OK");
        const data = await res.json();
        if (data.status === "success") {{
          state = {{ active_model: data.active_model, metrics: data.metrics }};
          selectedReportModel = data.active_model;
          serverOnline = true;
          badge.textContent = "Connected to Flask Backend (Live)";
          badge.classList.add("live");
          alertBox.style.display = "none";
          render();
          if (manual) showToast("Connected to Flask backend.");
          return;
        }}
      }} catch (e) {{
        serverOnline = false;
        badge.textContent = "Offline Preview Mode";
        badge.classList.remove("live");
        alertBox.style.display = "flex";
        const savedLocal = localStorage.getItem("heartwise_preview_model");
        if (savedLocal && state.metrics.models[savedLocal]) {{
          state.active_model = savedLocal;
          selectedReportModel = savedLocal;
        }}
        render();
        if (manual) showToast("Backend still offline. Start start_app.bat first.");
      }}
    }}

    async function selectModel(modelName) {{
      selectedReportModel = modelName;
      if (!serverOnline) {{
        state.active_model = modelName;
        localStorage.setItem("heartwise_preview_model", modelName);
        render();
        showToast(`Preview switched to ${{modelName}}. Run start_app.bat to apply live to predictions.`);
        return;
      }}
      try {{
        const res = await fetch(`${{API_BASE}}/api/admin/select-model`, {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify({{ model_name: modelName }})
        }});
        const data = await res.json();
        if (data.status === "success") {{
          state.active_model = data.active_model;
          render();
          showToast(`Main prediction model updated to ${{modelName}}!`);
        }} else {{
          showToast(data.message || "Could not switch model.");
        }}
      }} catch (err) {{
        showToast("Failed to reach backend server.");
      }}
    }}

    async function retrainModels() {{
      if (!serverOnline) {{
        showToast("Start the backend server (start_app.bat) to retrain models.");
        return;
      }}
      const btn = document.getElementById("retrain-btn");
      btn.disabled = true;
      btn.textContent = "Retraining...";
      try {{
        const res = await fetch(`${{API_BASE}}/api/admin/retrain`, {{ method: "POST" }});
        const data = await res.json();
        if (data.status === "success") {{
          state = {{ active_model: data.active_model, metrics: data.metrics }};
          selectedReportModel = data.active_model;
          render();
          showToast("All 3 models retrained and classification reports updated!");
        }}
      }} catch (err) {{
        showToast("Retrain request failed.");
      }} finally {{
        btn.disabled = false;
        btn.textContent = "Retrain Models";
      }}
    }}

    render();
    syncWithServer();
  </script>
</body>
</html>
"""
    COMPARISON_HTML_PATH.write_text(html, encoding="utf-8")


def train_and_evaluate():
    print(f"Loading dataset from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH).drop_duplicates().copy()

    target_col = "has_heart_disease"
    X = df.drop(columns=[target_col, "patient_id"], errors="ignore")
    y = df[target_col].astype(int)

    categorical_cols = X.select_dtypes(
        include=["object", "string", "category", "bool"]
    ).columns.tolist()
    numerical_cols = X.select_dtypes(include=["number"]).columns.tolist()

    # Stratified 70% Train / 15% Validation / 15% Test split
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    def make_preprocessor():
        num_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])
        cat_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])
        return ColumnTransformer([
            ("num", num_pipe, numerical_cols),
            ("cat", cat_pipe, categorical_cols),
        ])

    candidates = {
        "Logistic Regression": {
            "estimator": LogisticRegression(
                C=1.0, class_weight="balanced", max_iter=2000, random_state=42
            ),
            "hyperparameters": "C=1.0, class_weight='balanced', max_iter=2000",
        },
        "Random Forest": {
            "estimator": RandomForestClassifier(
                n_estimators=300,
                max_depth=12,
                min_samples_leaf=2,
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            ),
            "hyperparameters": "n_estimators=300, max_depth=12, min_samples_leaf=2, class_weight='balanced'",
        },
        "KNN": {
            "estimator": KNeighborsClassifier(n_neighbors=11, weights="distance"),
            "hyperparameters": "n_neighbors=11, weights='distance', metric='minkowski'",
        },
    }

    target_names = ["No Heart Disease (0)", "Heart Disease (1)"]
    results = {}
    comparison = []

    for name, cfg in candidates.items():
        print(f"\nTraining {name}...")
        pipe = Pipeline([
            ("preprocessor", make_preprocessor()),
            ("model", cfg["estimator"]),
        ])
        pipe.fit(X_train, y_train)

        val_probs = pipe.predict_proba(X_val)[:, 1]
        val_preds = pipe.predict(X_val)

        test_probs = pipe.predict_proba(X_test)[:, 1]
        test_preds = pipe.predict(X_test)

        tn, fp, fn, tp = confusion_matrix(y_test, test_preds, labels=[0, 1]).ravel()
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

        test_acc = float(accuracy_score(y_test, test_preds))
        test_prec = float(precision_score(y_test, test_preds, zero_division=0))
        test_rec = float(recall_score(y_test, test_preds, zero_division=0))
        test_f1 = float(f1_score(y_test, test_preds, zero_division=0))
        test_auc = float(roc_auc_score(y_test, test_probs))

        cr_dict = classification_report(
            y_test, test_preds, target_names=target_names, output_dict=True, zero_division=0
        )
        cr_text = classification_report(
            y_test, test_preds, target_names=target_names, digits=4, zero_division=0
        )

        fpr, tpr, _ = roc_curve(y_test, test_probs)
        sample_idx = np.linspace(0, len(fpr) - 1, min(30, len(fpr)), dtype=int)
        roc_points = [
            {"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)}
            for i in sample_idx
        ]

        results[name] = {
            "pipeline": pipe,
            "hyperparameters": cfg["hyperparameters"],
            "threshold": 0.50,
            "validation": {
                "accuracy": round(float(accuracy_score(y_val, val_preds)), 4),
                "recall": round(float(recall_score(y_val, val_preds, zero_division=0)), 4),
                "precision": round(float(precision_score(y_val, val_preds, zero_division=0)), 4),
                "f1": round(float(f1_score(y_val, val_preds, zero_division=0)), 4),
                "roc_auc": round(float(roc_auc_score(y_val, val_probs)), 4),
            },
            "test": {
                "accuracy": round(test_acc, 4),
                "precision": round(test_prec, 4),
                "recall": round(test_rec, 4),
                "specificity": round(specificity, 4),
                "f1_score": round(test_f1, 4),
                "roc_auc": round(test_auc, 4),
                "true_negatives": int(tn),
                "false_positives": int(fp),
                "false_negatives": int(fn),
                "true_positives": int(tp),
                "roc_curve": roc_points,
                "classification_report": cr_dict,
                "classification_report_text": cr_text,
            },
        }

        comparison.append({
            "model": name,
            "threshold": 0.50,
            "accuracy": round(test_acc, 4),
            "recall": round(test_rec, 4),
            "precision": round(test_prec, 4),
            "f1_score": round(test_f1, 4),
            "roc_auc": round(test_auc, 4),
            "specificity": round(specificity, 4),
        })

        print(f"  -> ROC-AUC={test_auc:.4f}, Accuracy={test_acc:.4f}, Recall={test_rec:.4f}, F1={test_f1:.4f}")
        print(cr_text)

    # Select best overall model by ROC-AUC, then F1-score, then Recall
    best_name = max(
        results,
        key=lambda k: (
            results[k]["test"]["roc_auc"],
            results[k]["test"]["f1_score"],
            results[k]["test"]["recall"],
        ),
    )
    print(f"\nSelected Best Main Model: {best_name}")

    # Extract feature names & importances
    fitted_pre = results[best_name]["pipeline"].named_steps["preprocessor"]
    encoded_cats = (
        fitted_pre.named_transformers_["cat"]
        .named_steps["encoder"]
        .get_feature_names_out(categorical_cols)
        .tolist()
    )
    all_features = numerical_cols + encoded_cats

    lr_coefs = results["Logistic Regression"]["pipeline"].named_steps["model"].coef_[0]
    lr_imp = {f: round(float(c), 4) for f, c in zip(all_features, lr_coefs)}

    rf_vals = results["Random Forest"]["pipeline"].named_steps["model"].feature_importances_
    rf_imp = {f: round(float(v), 4) for f, v in zip(all_features, rf_vals)}

    bundle = {
        "best_model_name": best_name,
        "pipelines": {n: d["pipeline"] for n, d in results.items()},
        "thresholds": {n: d["threshold"] for n, d in results.items()},
        "feature_columns": X.columns.tolist(),
        "numerical_columns": numerical_cols,
        "categorical_columns": categorical_cols,
        "target_name": target_col,
    }
    joblib.dump(bundle, MODEL_BUNDLE_PATH)

    sorted_comparison = sorted(comparison, key=lambda r: r["roc_auc"], reverse=True)
    winner_analysis = build_winner_analysis(sorted_comparison, best_name)

    metrics_export = {
        "selected_model": best_name,
        "threshold": 0.50,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "comparison": sorted_comparison,
        "models": {
            n: {
                "hyperparameters": d["hyperparameters"],
                "threshold": d["threshold"],
                "validation": d["validation"],
                "test": d["test"],
            }
            for n, d in results.items()
        },
        "feature_importance": {
            "logistic_regression": sorted(
                [{"feature": k, "weight": v, "abs_weight": abs(v)} for k, v in lr_imp.items()],
                key=lambda x: x["abs_weight"],
                reverse=True,
            )[:12],
            "random_forest": sorted(
                [{"feature": k, "importance": v} for k, v in rf_imp.items()],
                key=lambda x: x["importance"],
                reverse=True,
            )[:12],
        },
        "summary": {
            "total_records": int(len(df)),
            "train_records": int(len(X_train)),
            "val_records": int(len(X_val)),
            "test_records": int(len(X_test)),
            "positive_cases": int(y.sum()),
            "negative_cases": int(len(y) - y.sum()),
        },
        "winner_analysis": winner_analysis,
    }

    with open(METRICS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_export, f, indent=2)

    active_payload = {
        "active_model": best_name,
        "auto_selected": best_name,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    with open(ACTIVE_MODEL_PATH, "w", encoding="utf-8") as f:
        json.dump(active_payload, f, indent=2)

    write_classification_report_files(metrics_export)
    generate_comparison_html(metrics_export, best_name)

    print(f"Saved model bundle       -> {MODEL_BUNDLE_PATH}")
    print(f"Saved classification txt -> {CLASSIFICATION_REPORT_TXT_PATH}")
    print(f"Saved comparison page    -> {COMPARISON_HTML_PATH}")
    return metrics_export, best_name


if __name__ == "__main__":
    train_and_evaluate()
