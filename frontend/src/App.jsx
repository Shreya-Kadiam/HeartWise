import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './api/api';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AssessmentPage from './pages/AssessmentPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState('assessment');
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await api.getDashboard();
      setDashboard(res.dashboard);
      return res.dashboard;
    } catch {
      return null;
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setDashboard(null);
      setSelectedAssessment(null);
      setPage('assessment');
      return;
    }
    setPage('assessment');
    loadDashboard();
  }, [user, loadDashboard]);

  const navigate = (target) => {
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssessmentComplete = async (assessment) => {
    setSelectedAssessment(assessment);
    navigate('result');
    await loadDashboard();
  };

  const handleOpenAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    navigate('result');
  };

  if (authLoading) {
    return (
      <div className="auth-page">
        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading HeartWise...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-shell">
      <Navbar activePage={page} onNavigate={navigate} />

      <main className="page-main">
        {page === 'assessment' && (
          <AssessmentPage
            latestInput={dashboard?.latest?.input_data}
            onComplete={handleAssessmentComplete}
            onCancel={dashboard?.total_assessments > 0 ? () => navigate('dashboard') : null}
          />
        )}

        {page === 'result' && (
          <ResultPage
            key={(selectedAssessment || dashboard?.latest)?.id || 'latest'}
            assessment={selectedAssessment || dashboard?.latest}
            onBackToDashboard={() => navigate('dashboard')}
            onNewCheckup={() => navigate('assessment')}
          />
        )}

        {page === 'history' && (
          <HistoryPage
            assessments={dashboard?.assessments || []}
            onOpenAssessment={handleOpenAssessment}
            onStartCheckup={() => navigate('assessment')}
            onRefresh={loadDashboard}
          />
        )}

        {page === 'dashboard' && (
          <DashboardPage
            dashboard={dashboard}
            loading={dashLoading}
            onStartCheckup={() => navigate('assessment')}
            onOpenAssessment={handleOpenAssessment}
            onOpenHistory={() => navigate('history')}
          />
        )}
      </main>

      <footer className="footer">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span>HeartWise — Personal Heart Health &amp; Lifestyle Tracker</span>
          <span>Educational screening tool only. Always consult a physician for medical advice.</span>
        </div>
      </footer>
    </div>
  );
}
