import React, { useState } from 'react';
import { Heart, ArrowRight, Sun, Moon, ShieldCheck, Activity, Cpu, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    age: '35',
    sex: 'Male',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(form.username, form.password);
      } else {
        await register({
          full_name: form.full_name,
          username: form.username,
          email: form.email,
          password: form.password,
          age: form.age ? Number(form.age) : null,
          sex: form.sex,
        });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Left Hero Showcase */}
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
            <span className="brand-mark" style={{ width: '42px', height: '42px', borderRadius: '12px' }}>
              <Heart size={21} fill="#ffffff" />
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                HeartWise
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
                Personal Heart Health &amp; Lifestyle Platform
              </div>
            </div>
          </div>

          <h1 className="auth-hero-title">
            Proactive Heart Risk Assessment &amp; Recovery Tracking
          </h1>
          <p className="auth-hero-sub">
            Built on clinical and lifestyle benchmarks across 25 cardiovascular indicators — delivering calibrated risk scoring, factor breakdowns, and personalized daily action plans.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <span className="auth-feature-icon"><Cpu size={18} /></span>
              <div>
                <strong>Precision Cardiovascular Risk Scoring</strong>
                <span>Instant risk assessment powered by our best-performing validated clinical model.</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <span className="auth-feature-icon"><Activity size={18} /></span>
              <div>
                <strong>4-Step Clinical &amp; Lifestyle Checkup</strong>
                <span>Evaluates blood pressure, lipid profile, HbA1c, BMI, angina, daily steps, sleep, and stress.</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <span className="auth-feature-icon"><TrendingDown size={18} /></span>
              <div>
                <strong>Longitudinal Progress Tracking</strong>
                <span>Track improvements over previous dates and compare any two checkups side-by-side.</span>
              </div>
            </div>
          </div>

          <div className="auth-hero-footer">
            <ShieldCheck size={15} />
            <span>Educational &amp; clinical decision-support prototype · Local SQLite + Flask + React</span>
          </div>
        </div>
      </div>

      {/* Right Auth Card */}
      <div className="auth-panel">
        <div className="auth-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div className="auth-mobile-brand">
              <span className="brand-mark">
                <Heart size={18} fill="#ffffff" />
              </span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>HeartWise</span>
            </div>

            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              style={{ marginLeft: 'auto' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {mode === 'login'
              ? 'Sign in to run a checkup, view your progress, or review recommendations.'
              : 'Set up your personal heart health profile in seconds.'}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              Create Account
            </button>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
              <div className="field">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  className="input"
                  placeholder="e.g. Jordan Taylor"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="username">
                {mode === 'login' ? 'Username or Email' : 'Username'}
              </label>
              <input
                id="username"
                name="username"
                className="input"
                placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="field">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                value={form.password}
                onChange={handleChange}
                minLength={mode === 'register' ? 6 : undefined}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="form-grid" style={{ gap: '12px' }}>
                <div className="field">
                  <label htmlFor="age">Age</label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="18"
                    max="100"
                    className="input"
                    value={form.age}
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label htmlFor="sex">Biological Sex</label>
                  <select
                    id="sex"
                    name="sex"
                    className="select"
                    value={form.sex}
                    onChange={handleChange}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '6px' }}
              disabled={submitting}
            >
              <span>{submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
