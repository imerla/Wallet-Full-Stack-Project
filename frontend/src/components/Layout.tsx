import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import ChatWidget from './ChatWidget';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import type { Wallet } from '../types/wallet';

function Layout() {
  const { logout, role } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const response = await api.get<Wallet>('/wallet');
        setWallet(response.data);
      } catch (err) {
        console.error('Failed to fetch wallet for header:', err);
      }
    };
    fetchWallet();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      <header className="vertical-header">
        <Link to="/" className="layout-brand logo">
          <img src="/pngwing.com.png" alt="Wallet Logo" className="brand-logo" />
          <span className="brand-text">Wallet</span>
        </Link>
        <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="/" className={isActive('/') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">🏠</span>
            Home
          </Link>
          <Link to="/top-up" className={isActive('/top-up') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">💳</span>
            Top Up
          </Link>
          <Link to="/transfer" className={isActive('/transfer') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">💸</span>
            Transfer
          </Link>
          <Link to="/request-money" className={isActive('/request-money') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">💰</span>
            Request Money
          </Link>
          <Link to="/money-requests" className={isActive('/money-requests') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">📥</span>
            Money Requests
          </Link>
          <Link to="/transactions" className={isActive('/transactions') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">📋</span>
            Transactions
          </Link>
          <Link to="/analytics" className={isActive('/analytics') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">📊</span>
            Analytics
          </Link>
          <Link to="/chat" className={isActive('/chat') ? 'active' : ''} onClick={closeMobileMenu}>
            <span className="nav-icon">💬</span>
            {role === 'ADMIN' ? 'Support Chats' : 'Support'}
          </Link>
          {role === 'ADMIN' && (
            <>
              <Link to="/admin" className={isActive('/admin') ? 'active' : ''} onClick={closeMobileMenu}>
                <span className="nav-icon">⚙️</span>
                Admin
              </Link>
              <Link to="/admin/webhook" className={isActive('/admin/webhook') ? 'active' : ''} onClick={closeMobileMenu}>
                <span className="nav-icon">🔌</span>
                Webhook
              </Link>
            </>
          )}
        </nav>
        <div className="layout-user-section">
          {wallet && (
            <Link to="/profile" className="layout-user-info">
              <div className="layout-user-avatar">
                {wallet.username ? getInitials(wallet.username) : 'U'}
              </div>
              <div className="layout-user-details">
                <span className="layout-user-name">{wallet.username || 'User'}</span>
                <span className="layout-user-email">{wallet.email || ''}</span>
              </div>
            </Link>
          )}
        </div>
        <div className="layout-actions">
          <div className="mobile-user-section">
            {wallet && (
              <Link to="/profile" className="layout-user-info">
                <div className="layout-user-avatar">
                  {wallet.username ? getInitials(wallet.username) : 'U'}
                </div>
              </Link>
            )}
          </div>
          <NotificationBell />
          <button
            onClick={toggleDarkMode}
            className="layout-theme-toggle"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={handleLogout}
            className="layout-logout"
            aria-label="Logout"
          >
            Logout
          </button>
          <button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
}

export default Layout;
