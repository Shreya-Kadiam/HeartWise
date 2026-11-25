import React from 'react';
import {
  Heart,
  LayoutDashboard,
  ClipboardPlus,
  CalendarClock,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'assessment', label: 'New Checkup', icon: ClipboardPlus },
    { id: 'history', label: 'Past Checkups', icon: CalendarClock },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <button className="brand" onClick={() => onNavigate('assessment')}>
          <span className="brand-mark">
            <Heart size={18} fill="#ffffff" />
          </span>
          <span>HeartWise</span>
        </button>

        <nav className="nav-links" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activePage === item.id ||
              (activePage === 'result' && item.id === 'assessment');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="nav-user">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="user-chip">
            <span className="user-avatar">{initials}</span>
            <span className="user-name-text">{user?.full_name || user?.username}</span>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
