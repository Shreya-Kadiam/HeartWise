import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { id: 1, title: 'Medical Info', sub: 'Vitals & labs' },
  { id: 2, title: 'Lifestyle Info', sub: 'Diet, sleep & habits' },
  { id: 3, title: 'Medical History', sub: 'Symptoms & family' },
  { id: 4, title: 'Activity Info', sub: 'Exercise & steps' },
];

const DIET_OPTIONS = [
  { label: 'Mostly Processed / Fast Food', score: 35 },
  { label: 'Average / Mixed', score: 55 },
  { label: 'Balanced Home Meals', score: 72 },
  { label: 'Heart-Healthy / Plant-Rich', score: 88 },
];

const CHEST_PAIN_OPTIONS = [
  { value: 'Asymptomatic', label: 'None / No Chest Pain', desc: 'No chest discomfort' },
  { value: 'Non-Anginal Pain', label: 'Non-Cardiac Chest Pain', desc: 'Sharp or brief unrelated pain' },
  { value: 'Atypical Angina', label: 'Atypical Discomfort', desc: 'Occasional chest tightness' },
  { value: 'Typical Angina', label: 'Typical Angina', desc: 'Chest pressure during exertion' },
];

export default function AssessmentPage({ latestInput, onComplete, onCancel }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [showLabs, setShowLabs] = useState(false);
  const [maxHrTouched, setMaxHrTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const initialAge = latestInput?.age ?? user?.age ?? 40;
  const initialSex = latestInput?.sex ?? user?.sex ?? 'Male';

  const [form, setForm] = useState({
    // 1. Medical Info
    age: String(initialAge),
    sex: initialSex,
    height_cm: '172',
    weight_kg: latestInput?.bmi
      ? String(Math.round(Number(latestInput.bmi) * 1.72 * 1.72))
      : '74',
    resting_bp_systolic: String(latestInput?.resting_bp_systolic ?? 122),
    resting_bp_diastolic: String(latestInput?.resting_bp_diastolic ?? 80),
    resting_heart_rate: String(latestInput?.resting_heart_rate ?? 72),
    cholesterol_total: String(latestInput?.cholesterol_total ?? 190),
    hdl: String(latestInput?.hdl ?? 52),
    ldl: String(latestInput?.ldl ?? 110),
    triglycerides: String(latestInput?.triglycerides ?? 130),
    fasting_blood_sugar: String(latestInput?.fasting_blood_sugar ?? 94),
    hba1c: String(latestInput?.hba1c ?? 5.4),

    // 2. Lifestyle Info
    smoker_status: latestInput?.smoker_status ?? 'Never',
    alcohol_units_per_week: String(latestInput?.alcohol_units_per_week ?? 2),
    diet_quality_score: Number(latestInput?.diet_quality_score ?? 72),
    sleep_hours: String(latestInput?.sleep_hours ?? 7.5),
    stress_score: Number(latestInput?.stress_score ?? 35),

    // 3. Medical History
    family_history: Boolean(latestInput?.family_history ?? false),
    chest_pain_type: latestInput?.chest_pain_type ?? 'Asymptomatic',
    exercise_induced_angina: Boolean(latestInput?.exercise_induced_angina ?? false),
    st_depression: String(latestInput?.st_depression ?? 0.4),

    // 4. Activity Info
    exercise_minutes_per_week: String(latestInput?.exercise_minutes_per_week ?? 150),
    daily_steps: String(latestInput?.daily_steps ?? 7500),
    max_heart_rate_achieved: String(
      latestInput?.max_heart_rate_achieved ?? Math.max(110, 220 - Number(initialAge))
    ),
    wearable_owner: Boolean(latestInput?.wearable_owner ?? true),
  });

  const computedBmi = useMemo(() => {
    const h = Number(form.height_cm) / 100;
    const w = Number(form.weight_kg);
    if (!h || !w || h <= 0) return 24.5;
    return Number((w / (h * h)).toFixed(1));
  }, [form.height_cm, form.weight_kg]);

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'age' && !maxHrTouched) {
        const parsedAge = Number(value);
        if (parsedAge >= 18 && parsedAge <= 100) {
          next.max_heart_rate_achieved = String(Math.max(100, Math.min(210, 220 - parsedAge)));
        }
      }
      return next;
    });
    if (key === 'max_heart_rate_achieved') {
      setMaxHrTouched(true);
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => Math.min(4, s + 1));
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        age: Number(form.age),
        sex: form.sex,
        bmi: computedBmi,
        resting_bp_systolic: Number(form.resting_bp_systolic),
        resting_bp_diastolic: Number(form.resting_bp_diastolic),
        resting_heart_rate: Number(form.resting_heart_rate),
        cholesterol_total: Number(form.cholesterol_total),
        hdl: Number(form.hdl),
        ldl: Number(form.ldl),
        triglycerides: Number(form.triglycerides),
        fasting_blood_sugar: Number(form.fasting_blood_sugar),
        hba1c: Number(form.hba1c),
        smoker_status: form.smoker_status,
        alcohol_units_per_week: Number(form.alcohol_units_per_week),
        diet_quality_score: Number(form.diet_quality_score),
        sleep_hours: Number(form.sleep_hours),
        stress_score: Number(form.stress_score),
        family_history: Boolean(form.family_history),
        chest_pain_type: form.chest_pain_type,
        exercise_induced_angina: Boolean(form.exercise_induced_angina),
        st_depression: Number(form.st_depression),
        exercise_minutes_per_week: Number(form.exercise_minutes_per_week),
        daily_steps: Number(form.daily_steps),
        max_heart_rate_achieved: Number(form.max_heart_rate_achieved),
        wearable_owner: Boolean(form.wearable_owner),
      };

      const res = await api.predict(payload);
      onComplete(res.assessment);
    } catch (err) {
      setError(err.message || 'Could not complete risk checkup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stressLabel =
    form.stress_score <= 35 ? 'Low' : form.stress_score <= 65 ? 'Moderate' : 'High';

  return (
    <div className="container" style={{ maxWidth: '820px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Heart Health Checkup</h1>
          <p className="page-desc">
            Fill in your basic health details across 4 quick sections to check your heart risk.
          </p>
        </div>
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Back to Dashboard
          </button>
        )}
      </div>

      {/* 4-Step Header */}
      <div className="stepper">
        {STEPS.map((s) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={`step-tab ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => setStep(s.id)}
            >
              <span className="step-num">{isDone ? <Check size={14} /> : s.id}</span>
              <div>
                <div className="step-label">{s.title}</div>
                <div className="step-sub">{s.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        {/* STEP 1: MEDICAL INFO */}
        {step === 1 && (
          <div>
            <h2 className="card-title">1. Medical Information</h2>
            <p className="card-subtitle" style={{ marginBottom: '20px' }}>
              Enter your basic measurements and resting vitals.
            </p>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="age">Age (years)</label>
                <input
                  id="age"
                  type="number"
                  min="18"
                  max="100"
                  className="input"
                  value={form.age}
                  onChange={(e) => setField('age', e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Biological Sex</label>
                <div className="choice-row">
                  {['Male', 'Female'].map((sex) => (
                    <button
                      key={sex}
                      type="button"
                      className={`choice-btn ${form.sex === sex ? 'selected' : ''}`}
                      onClick={() => setField('sex', sex)}
                    >
                      {sex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="height_cm">Height (cm)</label>
                <input
                  id="height_cm"
                  type="number"
                  min="120"
                  max="230"
                  className="input"
                  value={form.height_cm}
                  onChange={(e) => setField('height_cm', e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="weight_kg">
                  <span>Weight (kg)</span>
                  <span className="field-hint">BMI: {computedBmi}</span>
                </label>
                <input
                  id="weight_kg"
                  type="number"
                  min="35"
                  max="220"
                  className="input"
                  value={form.weight_kg}
                  onChange={(e) => setField('weight_kg', e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="sbp">
                  <span>Systolic Blood Pressure</span>
                  <span className="field-hint">Normal &lt; 120 mmHg</span>
                </label>
                <input
                  id="sbp"
                  type="number"
                  min="80"
                  max="220"
                  className="input"
                  value={form.resting_bp_systolic}
                  onChange={(e) => setField('resting_bp_systolic', e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="dbp">
                  <span>Diastolic Blood Pressure</span>
                  <span className="field-hint">Normal &lt; 80 mmHg</span>
                </label>
                <input
                  id="dbp"
                  type="number"
                  min="50"
                  max="140"
                  className="input"
                  value={form.resting_bp_diastolic}
                  onChange={(e) => setField('resting_bp_diastolic', e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="rhr">
                  <span>Resting Heart Rate (bpm)</span>
                  <span className="field-hint">Typical 60–90 bpm</span>
                </label>
                <input
                  id="rhr"
                  type="number"
                  min="40"
                  max="140"
                  className="input"
                  value={form.resting_heart_rate}
                  onChange={(e) => setField('resting_heart_rate', e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="chol">
                  <span>Total Cholesterol (mg/dL)</span>
                  <span className="field-hint">Desirable &lt; 200</span>
                </label>
                <input
                  id="chol"
                  type="number"
                  min="100"
                  max="450"
                  className="input"
                  value={form.cholesterol_total}
                  onChange={(e) => setField('cholesterol_total', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Collapsible Optional Detailed Lab Values */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ paddingLeft: 0, color: 'var(--primary)' }}
                onClick={() => setShowLabs((prev) => !prev)}
              >
                {showLabs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>
                  {showLabs ? 'Hide detailed lab results' : 'Add detailed lab results (optional — defaults used if unknown)'}
                </span>
              </button>

              {showLabs && (
                <div className="form-grid" style={{ marginTop: '14px' }}>
                  <div className="field">
                    <label htmlFor="ldl">
                      <span>LDL Cholesterol (mg/dL)</span>
                      <span className="field-hint">Target &lt; 100</span>
                    </label>
                    <input
                      id="ldl"
                      type="number"
                      className="input"
                      value={form.ldl}
                      onChange={(e) => setField('ldl', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="hdl">
                      <span>HDL Cholesterol (mg/dL)</span>
                      <span className="field-hint">Target 50+</span>
                    </label>
                    <input
                      id="hdl"
                      type="number"
                      className="input"
                      value={form.hdl}
                      onChange={(e) => setField('hdl', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="trig">
                      <span>Triglycerides (mg/dL)</span>
                      <span className="field-hint">Normal &lt; 150</span>
                    </label>
                    <input
                      id="trig"
                      type="number"
                      className="input"
                      value={form.triglycerides}
                      onChange={(e) => setField('triglycerides', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="fbs">
                      <span>Fasting Blood Sugar (mg/dL)</span>
                      <span className="field-hint">Normal &lt; 100</span>
                    </label>
                    <input
                      id="fbs"
                      type="number"
                      className="input"
                      value={form.fasting_blood_sugar}
                      onChange={(e) => setField('fasting_blood_sugar', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="hba1c">
                      <span>HbA1c (%)</span>
                      <span className="field-hint">Normal &lt; 5.7%</span>
                    </label>
                    <input
                      id="hba1c"
                      type="number"
                      step="0.1"
                      className="input"
                      value={form.hba1c}
                      onChange={(e) => setField('hba1c', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: LIFESTYLE INFO */}
        {step === 2 && (
          <div>
            <h2 className="card-title">2. Lifestyle Information</h2>
            <p className="card-subtitle" style={{ marginBottom: '20px' }}>
              Tell us about your everyday habits — these strongly guide your personalized suggestions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="field">
                <label>Smoking Status</label>
                <div className="choice-row">
                  {['Never', 'Former', 'Current'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`choice-btn ${form.smoker_status === status ? 'selected' : ''}`}
                      onClick={() => setField('smoker_status', status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Everyday Diet & Eating Pattern</label>
                <div className="form-grid" style={{ gap: '10px' }}>
                  {DIET_OPTIONS.map((opt) => (
                    <button
                      key={opt.score}
                      type="button"
                      className={`choice-btn ${
                        Math.abs(form.diet_quality_score - opt.score) < 10 ? 'selected' : ''
                      }`}
                      onClick={() => setField('diet_quality_score', opt.score)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="sleep_hours">
                    <span>Average Nightly Sleep (hours)</span>
                    <span className="field-hint">Recommended 7–9 hrs</span>
                  </label>
                  <input
                    id="sleep_hours"
                    type="number"
                    step="0.5"
                    min="3"
                    max="12"
                    className="input"
                    value={form.sleep_hours}
                    onChange={(e) => setField('sleep_hours', e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="alcohol">
                    <span>Alcohol Intake (drinks/week)</span>
                    <span className="field-hint">0 if none</span>
                  </label>
                  <input
                    id="alcohol"
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    className="input"
                    value={form.alcohol_units_per_week}
                    onChange={(e) => setField('alcohol_units_per_week', e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="stress">
                  <span>Daily Stress Level</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    {form.stress_score}/100 ({stressLabel})
                  </span>
                </label>
                <input
                  id="stress"
                  type="range"
                  min="0"
                  max="100"
                  value={form.stress_score}
                  onChange={(e) => setField('stress_score', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  <span>Calm / Low</span>
                  <span>Moderate</span>
                  <span>High / Chronic</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: MEDICAL HISTORY */}
        {step === 3 && (
          <div>
            <h2 className="card-title">3. Medical History & Symptoms</h2>
            <p className="card-subtitle" style={{ marginBottom: '20px' }}>
              Share relevant family history and any chest symptoms you may experience.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-grid">
                <div className="field">
                  <label>Family History of Heart Disease?</label>
                  <div className="choice-row">
                    <button
                      type="button"
                      className={`choice-btn ${!form.family_history ? 'selected' : ''}`}
                      onClick={() => setField('family_history', false)}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className={`choice-btn ${form.family_history ? 'selected' : ''}`}
                      onClick={() => setField('family_history', true)}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Chest Pain During Physical Exertion?</label>
                  <div className="choice-row">
                    <button
                      type="button"
                      className={`choice-btn ${!form.exercise_induced_angina ? 'selected' : ''}`}
                      onClick={() => setField('exercise_induced_angina', false)}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className={`choice-btn ${form.exercise_induced_angina ? 'selected' : ''}`}
                      onClick={() => setField('exercise_induced_angina', true)}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Chest Pain / Discomfort Type</label>
                <div className="form-grid" style={{ gap: '10px' }}>
                  {CHEST_PAIN_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`choice-btn ${form.chest_pain_type === opt.value ? 'selected' : ''}`}
                      style={{ textAlign: 'left', padding: '12px 14px' }}
                      onClick={() => setField('chest_pain_type', opt.value)}
                    >
                      <div style={{ fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field" style={{ maxWidth: '340px' }}>
                <label htmlFor="st_dep">
                  <span>Stress ECG ST Depression (mm)</span>
                  <span className="field-hint">Optional — 0.4 if unknown</span>
                </label>
                <input
                  id="st_dep"
                  type="number"
                  step="0.1"
                  min="0"
                  max="6"
                  className="input"
                  value={form.st_depression}
                  onChange={(e) => setField('st_depression', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ACTIVITY INFO */}
        {step === 4 && (
          <div>
            <h2 className="card-title">4. Physical Activity Information</h2>
            <p className="card-subtitle" style={{ marginBottom: '20px' }}>
              Share your typical weekly movement and exercise routine.
            </p>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="exercise_min">
                  <span>Weekly Exercise (minutes/week)</span>
                  <span className="field-hint">Goal: 150+ min</span>
                </label>
                <input
                  id="exercise_min"
                  type="number"
                  min="0"
                  max="1200"
                  className="input"
                  value={form.exercise_minutes_per_week}
                  onChange={(e) => setField('exercise_minutes_per_week', e.target.value)}
                />
                <div className="chip-row">
                  {[30, 90, 150, 240].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="chip"
                      onClick={() => setField('exercise_minutes_per_week', String(v))}
                    >
                      {v} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="daily_steps">
                  <span>Average Daily Steps</span>
                  <span className="field-hint">Goal: 7,500+</span>
                </label>
                <input
                  id="daily_steps"
                  type="number"
                  min="500"
                  max="35000"
                  step="100"
                  className="input"
                  value={form.daily_steps}
                  onChange={(e) => setField('daily_steps', e.target.value)}
                />
                <div className="chip-row">
                  {[3500, 6000, 8500, 10000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="chip"
                      onClick={() => setField('daily_steps', String(v))}
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="max_hr">
                  <span>Peak Exercise Heart Rate (bpm)</span>
                  <span className="field-hint">Auto-estimated from age</span>
                </label>
                <input
                  id="max_hr"
                  type="number"
                  min="80"
                  max="220"
                  className="input"
                  value={form.max_heart_rate_achieved}
                  onChange={(e) => setField('max_heart_rate_achieved', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Do you use a fitness tracker or smartwatch?</label>
                <div className="choice-row">
                  <button
                    type="button"
                    className={`choice-btn ${form.wearable_owner ? 'selected' : ''}`}
                    onClick={() => setField('wearable_owner', true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`choice-btn ${!form.wearable_owner ? 'selected' : ''}`}
                    onClick={() => setField('wearable_owner', false)}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '28px',
            paddingTop: '18px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          {step < 4 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              <span>{submitting ? 'Calculating Risk...' : 'Predict My Heart Risk'}</span>
              {!submitting && <ArrowRight size={16} />}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
