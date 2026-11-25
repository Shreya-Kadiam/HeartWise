# HeartWise — Heart Disease Risk Prediction & Progress Tracker

A full-stack machine learning web application with a clean React frontend, modular Flask + SQLite backend, automated training & comparison across 3 ML models, and private developer evaluation reports.

---

## Key Design

- **User-Facing Frontend (`http://127.0.0.1:5000`)**: Clean patient/user experience (Login, 4-Step Health Checkup, Risk Result & Lifestyle Suggestions, Past Checkups Comparison, Dashboard). Users **never** see the 3 candidate ML models — predictions automatically use the best model selected during backend training (**Logistic Regression**).
- **Backend ML Pipeline & Reports (To Show Sir)**:
  - `backend/ml/train_models.py` trains **Logistic Regression**, **Random Forest**, and **KNN** on `data/heart_disease_risk_4000_rows.csv`, compares them on a held-out test set, and selects the best model automatically.
  - `backend/reports/classification_reports.txt` and `backend/reports/classification_reports.json` contain the full `classification_report`, confusion matrices, ROC-AUC comparison, and explanation of why Logistic Regression outperforms Random Forest on this dataset.
  - `backend/ml/show_classification_reports.py` prints all 3 trained models and their classification reports directly in the terminal.
  - `model_comparison.html` (or `http://127.0.0.1:5000/model-comparison`) provides an internal visual comparison page for developer/faculty review.

---

## Project Structure

```text
heartwise-pro/
├── data/
│   └── heart_disease_risk_4000_rows.csv      # 4,000-row clinical & lifestyle dataset
│
├── backend/
│   ├── app.py                                # Flask API + serves built React app
│   ├── config.py                             # Centralized paths
│   ├── requirements.txt                      # Python dependencies
│   ├── heartwise.db                          # SQLite database
│   │
│   ├── ml/                                   # Machine Learning Package
│   │   ├── train_models.py                   # Trains KNN, Logistic Regression, Random Forest + picks best
│   │   ├── show_classification_reports.py    # Prints all 3 trained models & classification reports
│   │   ├── ml_service.py                     # Runs prediction using the active best model
│   │   ├── explainer.py                      # Clinical benchmark factor explanation
│   │   └── recommender.py                    # Personalized lifestyle suggestions
│   │
│   ├── db/                                   # Database Package
│   │   └── database.py                       # SQLite auth & assessment history
│   │
│   ├── artifacts/                            # Saved Trained Models
│   │   ├── model_bundle.joblib
│   │   ├── model_metrics.json
│   │   └── active_model.json
│   │
│   └── reports/                              # Classification Reports (Show Sir)
│       ├── classification_reports.txt
│       └── classification_reports.json
│
├── frontend/                                 # React + Vite frontend
├── model_comparison.html                     # Private developer/admin model comparison page
├── start_app.bat                             # One-click launch (opens http://127.0.0.1:5000)
└── start_dev.bat                             # Development mode (Flask + Vite)
```

---

## How to Run

### 1. Start the Application
Double-click **`start_app.bat`** (or run `cd backend && python app.py`), then open **http://127.0.0.1:5000**.
- Demo login: **`demo`** / **`demo123`**

### 2. Show Backend Training & Classification Reports to Sir
Run:
```bash
python backend/ml/show_classification_reports.py
```
Or open **`backend/reports/classification_reports.txt`** or **`http://127.0.0.1:5000/model-comparison`**.
