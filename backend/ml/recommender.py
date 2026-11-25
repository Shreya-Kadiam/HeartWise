"""
Lifestyle Suggestions Engine
Generates actionable, prioritized lifestyle changes tailored to the user's
predicted risk level and specific medical, lifestyle, and activity inputs.
"""


def generate_recommendations(data: dict, risk_tier: str, risk_prob: float) -> dict:
    recs = {
        "diet": [],
        "activity": [],
        "lifestyle": [],
        "medical": []
    }

    sbp = float(data.get("resting_bp_systolic", 120))
    ldl = float(data.get("ldl", 100))
    chol = float(data.get("cholesterol_total", 180))
    triglycerides = float(data.get("triglycerides", 120))
    fbs = float(data.get("fasting_blood_sugar", 92))
    bmi = float(data.get("bmi", 24.0))
    diet_score = float(data.get("diet_quality_score", 70))

    exercise_min = float(data.get("exercise_minutes_per_week", 150))
    steps = float(data.get("daily_steps", 7000))
    has_angina = bool(data.get("exercise_induced_angina", False))

    smoker = str(data.get("smoker_status", "Never")).strip().capitalize()
    alcohol = float(data.get("alcohol_units_per_week", 2))
    sleep = float(data.get("sleep_hours", 7.5))
    stress = float(data.get("stress_score", 35))

    # ------------------------------------------------------------------
    # 1. DIET & NUTRITION
    # ------------------------------------------------------------------
    if sbp >= 130:
        recs["diet"].append({
            "title": "Follow a Low-Sodium DASH Eating Pattern",
            "priority": "High Priority",
            "tag": "Blood Pressure",
            "body": f"Your systolic BP is {int(sbp)} mmHg. Keep daily sodium under 2,000 mg (less than 1 tsp of salt), cut packaged sauces/snacks, and add potassium-rich foods like leafy greens, beans, and bananas."
        })

    if ldl >= 130 or chol >= 200:
        recs["diet"].append({
            "title": "Boost Soluble Fiber & Healthy Fats",
            "priority": "High Priority" if ldl >= 160 else "Recommended",
            "tag": "Cholesterol",
            "body": f"With total cholesterol at {int(chol)} mg/dL (LDL {int(ldl)} mg/dL), swap butter and fried foods for olive oil, walnuts, oats, lentils, and flaxseed to actively lower LDL."
        })

    if triglycerides >= 150 or fbs >= 100:
        recs["diet"].append({
            "title": "Cut Added Sugars & Refined Carbs",
            "priority": "Recommended",
            "tag": "Metabolic Health",
            "body": "Limit sugary drinks, white bread, and pastries. Pair complex carbohydrates with lean protein and healthy fats to steady blood sugar and triglycerides."
        })

    if bmi >= 25.0:
        recs["diet"].append({
            "title": "Gradual, Sustainable Weight Management",
            "priority": "Recommended",
            "tag": "Weight",
            "body": f"At a BMI of {bmi:.1f}, losing even 5–7% of body weight through smaller portions and high-fiber meals measurably improves blood pressure and lipid levels."
        })

    if diet_score < 65:
        recs["diet"].append({
            "title": "Shift Toward Whole Mediterranean Meals",
            "priority": "Action Plan",
            "tag": "Daily Nutrition",
            "body": "Fill half your plate with colorful vegetables, include fatty fish (like salmon or mackerel) twice a week, and cook more meals at home instead of relying on ultra-processed foods."
        })
    elif not recs["diet"]:
        recs["diet"].append({
            "title": "Maintain Your Heart-Healthy Diet",
            "priority": "On Track",
            "tag": "Maintenance",
            "body": "Your nutrition and metabolic markers look strong. Keep emphasizing whole grains, vegetables, nuts, legumes, and healthy unsaturated fats."
        })

    # ------------------------------------------------------------------
    # 2. PHYSICAL ACTIVITY & EXERCISE
    # ------------------------------------------------------------------
    if has_angina:
        recs["activity"].append({
            "title": "Get Medical Clearance Before Strenuous Exercise",
            "priority": "Safety First",
            "tag": "Important",
            "body": "Because you reported chest discomfort during exertion, avoid intense workouts until a doctor evaluates your symptoms and advises safe heart-rate zones."
        })
    elif exercise_min < 90:
        recs["activity"].append({
            "title": "Build Up to 150 Minutes of Weekly Cardio",
            "priority": "High Priority",
            "tag": "Cardio Goal",
            "body": f"You are currently at {int(exercise_min)} min/week. Start with a manageable 20–25 minute brisk walk 5 days a week and gradually increase duration."
        })
    elif exercise_min < 150:
        recs["activity"].append({
            "title": "Close the Gap to 150+ Minutes/Week",
            "priority": "Recommended",
            "tag": "Cardio Goal",
            "body": f"You are doing well at {int(exercise_min)} min/week. Add two 20-minute sessions of cycling, swimming, or brisk walking to reach the heart-health benchmark."
        })
    else:
        recs["activity"].append({
            "title": "Keep Your Cardio & Add Strength Training",
            "priority": "On Track",
            "tag": "Active Lifestyle",
            "body": f"Great consistency at {int(exercise_min)} min/week! Pair your aerobic workouts with 2 short strength-training sessions weekly to improve insulin sensitivity."
        })

    if steps < 6500:
        recs["activity"].append({
            "title": "Increase Daily Movement (+1,500 Steps/Day)",
            "priority": "Action Plan",
            "tag": "Daily Steps",
            "body": f"You average {int(steps):,} steps/day. Adding a 10-minute walk after lunch and dinner easily adds 1,500–2,000 steps and reduces prolonged sitting time."
        })
    else:
        recs["activity"].append({
            "title": "Maintain Consistent Daily Steps",
            "priority": "On Track",
            "tag": "Daily Steps",
            "body": f"Averaging {int(steps):,} steps/day supports healthy blood circulation and resting heart rate. Aim to stay above 7,500 steps most days."
        })

    # ------------------------------------------------------------------
    # 3. LIFESTYLE, HABITS, SLEEP & STRESS
    # ------------------------------------------------------------------
    if smoker == "Current":
        recs["lifestyle"].append({
            "title": "Create a Smoking Cessation Plan",
            "priority": "High Priority",
            "tag": "Tobacco",
            "body": "Quitting smoking is the single highest-impact change you can make for heart health. Within 1 year of quitting, excess risk of coronary heart disease drops by half."
        })

    if alcohol > 7:
        recs["lifestyle"].append({
            "title": "Scale Back Weekly Alcohol Intake",
            "priority": "Recommended",
            "tag": "Alcohol",
            "body": f"At {alcohol:.0f} drinks/week, introducing 3–4 alcohol-free days per week can quickly lower blood pressure, improve sleep quality, and reduce triglycerides."
        })

    if sleep < 6.5:
        recs["lifestyle"].append({
            "title": "Prioritize 7–8 Hours of Consistent Sleep",
            "priority": "High Priority",
            "tag": "Sleep",
            "body": f"Averaging {sleep:.1f} hours/night raises stress hormones and keeps nighttime blood pressure elevated. Set a fixed bedtime and avoid screens 45 minutes before sleep."
        })
    elif sleep > 9.5:
        recs["lifestyle"].append({
            "title": "Check Sleep Quality & Consistency",
            "priority": "Recommended",
            "tag": "Sleep",
            "body": f"Regularly sleeping {sleep:.1f} hours may indicate fragmented rest or sleep apnea. Aim for a steady wake time and mention daytime fatigue to your doctor."
        })
    else:
        recs["lifestyle"].append({
            "title": "Protect Your Healthy Sleep Routine",
            "priority": "On Track",
            "tag": "Sleep",
            "body": f"Getting {sleep:.1f} hours of nightly sleep gives your cardiovascular system the recovery window it needs."
        })

    if stress > 60:
        recs["lifestyle"].append({
            "title": "Add Daily Stress Recovery Practices",
            "priority": "High Priority",
            "tag": "Stress",
            "body": f"Your stress score ({int(stress)}/100) is elevated. Practice 5 minutes of slow paced breathing (4s inhale, 6s exhale), short outdoor breaks, or mindfulness to calm your nervous system."
        })
    elif stress > 40:
        recs["lifestyle"].append({
            "title": "Build Short Decompression Breaks",
            "priority": "Recommended",
            "tag": "Stress",
            "body": "Keep moderate stress from accumulating with scheduled screen-free breaks, light stretching, and regular physical activity."
        })

    # ------------------------------------------------------------------
    # 4. MEDICAL NEXT STEPS (BASED ON RISK TIER)
    # ------------------------------------------------------------------
    if risk_tier == "High Risk" or risk_prob >= 65:
        recs["medical"].append({
            "title": "Book a Preventive Cardiology Consultation",
            "priority": "High Priority",
            "tag": "Clinical Follow-up",
            "body": "Your screening result falls in the High Risk range. Share your blood pressure, cholesterol, and symptom details with a physician for formal clinical evaluation (such as an ECG and comprehensive lipid panel)."
        })
        recs["medical"].append({
            "title": "Track Vitals & Re-check in 30 Days",
            "priority": "Action Plan",
            "tag": "Monitoring",
            "body": "Monitor home blood pressure twice weekly and return here in 30 days to track how lifestyle adjustments or prescribed treatments change your risk score."
        })
    elif risk_tier == "Moderate Risk" or risk_prob >= 30:
        recs["medical"].append({
            "title": "Schedule a Routine Primary Care Checkup",
            "priority": "Recommended",
            "tag": "Clinical Follow-up",
            "body": "Your screening shows moderate risk markers. Plan a routine checkup within 1–3 months to review your blood pressure, fasting glucose, and lipid panel with your doctor."
        })
        recs["medical"].append({
            "title": "Re-assess Progress in 4–6 Weeks",
            "priority": "Action Plan",
            "tag": "Monitoring",
            "body": "Apply 2–3 targeted habits from above and log a fresh checkup next month to measure your improvement on the dashboard."
        })
    else:
        recs["medical"].append({
            "title": "Continue Annual Preventive Checkups",
            "priority": "On Track",
            "tag": "Prevention",
            "body": "Your predicted cardiovascular risk is currently low. Maintain your healthy lifestyle, get routine annual lab work, and check back every 3–6 months to stay on track."
        })

    return recs
