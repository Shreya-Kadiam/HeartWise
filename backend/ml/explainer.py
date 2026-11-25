"""
Clinical Risk Explanation Engine
Evaluates user health inputs against standard clinical reference benchmarks
to identify key risk-increasing drivers and protective health habits.
"""

BENCHMARKS = {
    "resting_bp_systolic": {
        "name": "Systolic Blood Pressure",
        "unit": "mmHg",
        "normal_max": 120,
        "elevated_max": 139,
        "direction": "high_is_risk",
        "desc": "Healthy systolic BP is under 120 mmHg. Values of 130+ indicate hypertension."
    },
    "resting_bp_diastolic": {
        "name": "Diastolic Blood Pressure",
        "unit": "mmHg",
        "normal_max": 80,
        "elevated_max": 89,
        "direction": "high_is_risk",
        "desc": "Healthy diastolic BP is under 80 mmHg."
    },
    "cholesterol_total": {
        "name": "Total Cholesterol",
        "unit": "mg/dL",
        "normal_max": 200,
        "elevated_max": 239,
        "direction": "high_is_risk",
        "desc": "Desirable total cholesterol is under 200 mg/dL."
    },
    "ldl": {
        "name": "LDL Cholesterol",
        "unit": "mg/dL",
        "normal_max": 100,
        "elevated_max": 159,
        "direction": "high_is_risk",
        "desc": "Optimal LDL is under 100 mg/dL. Excess LDL contributes to arterial plaque."
    },
    "hdl": {
        "name": "HDL Cholesterol",
        "unit": "mg/dL",
        "normal_min": 50,
        "direction": "low_is_risk",
        "desc": "Higher HDL (50+ mg/dL) helps clear cholesterol from arteries."
    },
    "triglycerides": {
        "name": "Triglycerides",
        "unit": "mg/dL",
        "normal_max": 150,
        "elevated_max": 199,
        "direction": "high_is_risk",
        "desc": "Normal triglyceride levels are under 150 mg/dL."
    },
    "fasting_blood_sugar": {
        "name": "Fasting Blood Sugar",
        "unit": "mg/dL",
        "normal_max": 100,
        "elevated_max": 125,
        "direction": "high_is_risk",
        "desc": "Under 100 mg/dL is normal; 100–125 indicates prediabetes; 126+ indicates diabetes."
    },
    "hba1c": {
        "name": "HbA1c",
        "unit": "%",
        "normal_max": 5.6,
        "elevated_max": 6.4,
        "direction": "high_is_risk",
        "desc": "Under 5.7% reflects healthy 3-month blood sugar control."
    },
    "bmi": {
        "name": "Body Mass Index (BMI)",
        "unit": "kg/m²",
        "normal_min": 18.5,
        "normal_max": 24.9,
        "elevated_max": 29.9,
        "direction": "both",
        "desc": "Healthy BMI is 18.5–24.9. Over 25 increases cardiovascular workload."
    },
    "exercise_minutes_per_week": {
        "name": "Weekly Exercise",
        "unit": "min/week",
        "normal_min": 150,
        "direction": "low_is_risk",
        "desc": "At least 150 minutes of moderate activity per week is recommended."
    },
    "daily_steps": {
        "name": "Daily Steps",
        "unit": "steps/day",
        "normal_min": 7500,
        "direction": "low_is_risk",
        "desc": "7,500+ daily steps are linked to significantly lower heart disease risk."
    },
    "sleep_hours": {
        "name": "Nightly Sleep",
        "unit": "hrs/night",
        "normal_min": 7.0,
        "normal_max": 9.0,
        "direction": "both",
        "desc": "7 to 9 hours of sleep supports healthy nighttime blood pressure recovery."
    },
    "stress_score": {
        "name": "Stress Level",
        "unit": "/100",
        "normal_max": 45,
        "elevated_max": 70,
        "direction": "high_is_risk",
        "desc": "Chronic elevated stress raises cortisol, blood pressure, and heart rate."
    },
    "diet_quality_score": {
        "name": "Diet Quality",
        "unit": "/100",
        "normal_min": 70,
        "direction": "low_is_risk",
        "desc": "Whole-food, plant-rich diets protect arteries and reduce inflammation."
    },
}


def analyze_patient_risks(data: dict) -> dict:
    """Return structured risk factors, protective factors, and parameter statuses."""
    risk_factors = []
    protective_factors = []
    parameter_breakdown = []

    # Smoking
    smoker = str(data.get("smoker_status", "Never")).strip().capitalize()
    if smoker == "Current":
        risk_factors.append({
            "param": "Current Smoker",
            "impact": "High Impact",
            "detail": "Smoking accelerates arterial narrowing and strongly increases heart disease risk.",
            "severity": "high"
        })
    elif smoker == "Former":
        protective_factors.append({
            "param": "Former Smoker",
            "impact": "Improving",
            "detail": "Staying smoke-free steadily lowers cardiovascular risk every year.",
            "severity": "info"
        })
    else:
        protective_factors.append({
            "param": "Non-Smoker",
            "impact": "Protective",
            "detail": "Avoiding tobacco keeps blood vessel linings healthier.",
            "severity": "good"
        })

    # Alcohol
    try:
        alcohol = float(data.get("alcohol_units_per_week", 0))
        if alcohol > 14:
            risk_factors.append({
                "param": "High Alcohol Intake",
                "impact": f"{alcohol:.0f} drinks/week",
                "detail": "Consuming more than 14 units/week raises blood pressure and triglycerides.",
                "severity": "high"
            })
        elif alcohol > 7:
            risk_factors.append({
                "param": "Moderate-High Alcohol",
                "impact": f"{alcohol:.0f} drinks/week",
                "detail": "Cutting back below 7 drinks/week helps lower resting blood pressure.",
                "severity": "moderate"
            })
    except (ValueError, TypeError):
        pass

    # Chest pain & Exercise angina
    chest_pain = str(data.get("chest_pain_type", "Asymptomatic"))
    if chest_pain == "Typical Angina":
        risk_factors.append({
            "param": "Typical Angina",
            "impact": "High Impact",
            "detail": "Exertion-related chest pressure is a strong clinical sign to evaluate promptly.",
            "severity": "high"
        })
    elif chest_pain == "Atypical Angina":
        risk_factors.append({
            "param": "Atypical Angina",
            "impact": "Moderate Impact",
            "detail": "Recurring chest discomfort warrants discussion with a healthcare provider.",
            "severity": "moderate"
        })

    if bool(data.get("exercise_induced_angina", False)):
        risk_factors.append({
            "param": "Exercise-Induced Angina",
            "impact": "High Impact",
            "detail": "Chest pain triggered during physical activity indicates reduced cardiac blood flow.",
            "severity": "high"
        })

    if bool(data.get("family_history", False)):
        risk_factors.append({
            "param": "Family History of Heart Disease",
            "impact": "Genetic Factor",
            "detail": "Inherited predisposition makes preventive habits and routine screening extra valuable.",
            "severity": "moderate"
        })

    # Quantitative benchmarks
    for key, bench in BENCHMARKS.items():
        if key not in data or data[key] is None:
            continue
        try:
            val = float(data[key])
        except (ValueError, TypeError):
            continue

        status = "normal"
        status_label = "Healthy"

        if bench["direction"] == "high_is_risk":
            if val > bench["elevated_max"]:
                status = "high"
                status_label = "Elevated"
                risk_factors.append({
                    "param": f"High {bench['name']}",
                    "impact": f"{val:g} {bench['unit']} (Target < {bench['normal_max']})",
                    "detail": bench["desc"],
                    "severity": "high"
                })
            elif val > bench["normal_max"]:
                status = "moderate"
                status_label = "Borderline"
                risk_factors.append({
                    "param": f"Borderline {bench['name']}",
                    "impact": f"{val:g} {bench['unit']} (Target < {bench['normal_max']})",
                    "detail": bench["desc"],
                    "severity": "moderate"
                })
            else:
                protective_factors.append({
                    "param": f"Healthy {bench['name']}",
                    "impact": f"{val:g} {bench['unit']}",
                    "detail": "Within recommended target range.",
                    "severity": "good"
                })

        elif bench["direction"] == "low_is_risk":
            if val < bench["normal_min"]:
                status = "high" if val < bench["normal_min"] * 0.65 else "moderate"
                status_label = "Below Target"
                risk_factors.append({
                    "param": f"Low {bench['name']}",
                    "impact": f"{val:g} {bench['unit']} (Target >= {bench['normal_min']})",
                    "detail": bench["desc"],
                    "severity": status
                })
            else:
                protective_factors.append({
                    "param": f"Strong {bench['name']}",
                    "impact": f"{val:g} {bench['unit']}",
                    "detail": bench["desc"],
                    "severity": "good"
                })

        elif bench["direction"] == "both":
            if val < bench["normal_min"]:
                status = "moderate"
                status_label = "Below Range"
                risk_factors.append({
                    "param": f"Low {bench['name']}",
                    "impact": f"{val:g} {bench['unit']}",
                    "detail": bench["desc"],
                    "severity": "moderate"
                })
            elif "elevated_max" in bench and val > bench["elevated_max"]:
                status = "high"
                status_label = "High"
                risk_factors.append({
                    "param": f"High {bench['name']}",
                    "impact": f"{val:g} {bench['unit']}",
                    "detail": bench["desc"],
                    "severity": "high"
                })
            elif val > bench["normal_max"]:
                status = "moderate"
                status_label = "Above Range"
                risk_factors.append({
                    "param": f"Elevated {bench['name']}",
                    "impact": f"{val:g} {bench['unit']}",
                    "detail": bench["desc"],
                    "severity": "moderate"
                })
            else:
                protective_factors.append({
                    "param": f"Healthy {bench['name']}",
                    "impact": f"{val:g} {bench['unit']}",
                    "detail": bench["desc"],
                    "severity": "good"
                })

        parameter_breakdown.append({
            "code": key,
            "name": bench["name"],
            "value": round(val, 1),
            "unit": bench["unit"],
            "status": status,
            "status_label": status_label,
        })

    # Prioritize highest-severity risk factors first
    severity_rank = {"high": 0, "moderate": 1}
    risk_factors.sort(key=lambda item: severity_rank.get(item["severity"], 2))

    return {
        "risk_factors": risk_factors,
        "protective_factors": protective_factors,
        "parameter_breakdown": parameter_breakdown,
        "risk_count": len(risk_factors),
        "protective_count": len(protective_factors)
    }
