import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Wallet } from '../types/wallet';
import type { ChangeEmailRequest, ChangePasswordRequest } from '../types/auth';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Account settings state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [emailForm, setEmailForm] = useState<ChangeEmailRequest>({ email: '' });
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailApiError, setEmailApiError] = useState('');
  const [passwordApiError, setPasswordApiError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const walletResponse = await api.get<Wallet>('/wallet');
      setWallet(walletResponse.data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to load account information');
        }
      } else {
        setError('Failed to load account information');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateEmailForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!emailForm.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(emailForm.email)) {
      newErrors.email = 'Please enter a valid email';
    } else if (emailForm.email === wallet?.email) {
      newErrors.email = 'New email must be different from current email';
    }

    setEmailErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailApiError('');
    setEmailSuccess(false);

    if (!validateEmailForm()) {
      return;
    }

    setEmailLoading(true);

    try {
      await api.patch('/change-email', emailForm);
      setEmailSuccess(true);
      setShowChangeEmail(false);
      setEmailForm({ email: '' });
      // Refresh wallet data to get updated email
      fetchData();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setEmailApiError(error.response.data.message);
        } else {
          setEmailApiError('Failed to change email. Please try again.');
        }
      } else {
        setEmailApiError('Failed to change email. Please try again.');
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordApiError('');
    setPasswordSuccess(false);

    if (!validatePasswordForm()) {
      return;
    }

    setPasswordLoading(true);

    try {
      await api.patch('/change-password', passwordForm);
      setPasswordSuccess(true);
      setShowChangePassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setPasswordApiError(error.response.data.message);
        } else {
          setPasswordApiError('Failed to change password. Please try again.');
        }
      } else {
        setPasswordApiError('Failed to change password. Please try again.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Account information</p>
        </div>
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <Skeleton variant="circular" style={{ width: '80px', height: '80px' }} />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" style={{ height: '24px', width: '200px', marginBottom: '8px' }} />
                <Skeleton variant="text" style={{ height: '16px', width: '150px' }} />
              </div>
            </div>
            <div className="form-group">
              <Skeleton variant="text" style={{ height: '16px', width: '100px', marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ height: '20px', width: '100%' }} />
            </div>
            <div className="form-group">
              <Skeleton variant="text" style={{ height: '16px', width: '100px', marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ height: '20px', width: '100%' }} />
            </div>
            <div className="form-group">
              <Skeleton variant="text" style={{ height: '16px', width: '100px', marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ height: '20px', width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Account information</p>
        </div>
        <div className="alert alert-error">
          {error}
          <button onClick={fetchData} className="btn btn-secondary btn-sm" style={{ marginLeft: 'var(--space-2)' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Account information</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div className="avatar-large">
              {wallet?.username ? getInitials(wallet.username) : 'U'}
            </div>
            <div>
              <h2 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--font-size-xl)' }}>
                {wallet?.username || 'User'}
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                {wallet?.email || ''}
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-input" style={{ background: 'var(--background)' }}>
              {wallet?.username || '-'}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <div className="form-input" style={{ background: 'var(--background)', flex: 1 }}>
                {wallet?.email || '-'}
              </div>
              <button
                type="button"
                onClick={() => setShowChangeEmail(true)}
                className="btn btn-secondary btn-sm"
              >
                Change
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <div className="form-input" style={{ background: 'var(--background)' }}>
              {role || 'USER'}
            </div>
          </div>

          {wallet && (
            <>
              <div className="form-group">
                <label className="form-label">Wallet ID</label>
                <div className="form-input" style={{ background: 'var(--background)' }}>
                  {wallet.id}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Current Balance</label>
                <div className="form-input" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontWeight: '600' }}>
                  ${wallet.balance}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="card-footer">
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexDirection: 'column' }}>
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="btn btn-secondary"
            >
              Change Password
            </button>
            <button onClick={handleLogout} className="btn btn-danger">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Change Email Modal */}
      {showChangeEmail && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Change Email</h2>
            {emailSuccess && (
              <div className="alert alert-success">
                Email changed successfully!
              </div>
            )}
            <form onSubmit={handleEmailChange} className="form">
              <div className="form-group">
                <label htmlFor="new-email" className="form-label">New Email</label>
                <input
                  type="email"
                  id="new-email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ email: e.target.value })}
                  disabled={emailLoading}
                  className="form-input"
                  placeholder="Enter new email"
                />
                {emailErrors.email && <span className="form-error">{emailErrors.email}</span>}
              </div>
              {emailApiError && <div className="alert alert-error">{emailApiError}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeEmail(false);
                    setEmailForm({ email: '' });
                    setEmailErrors({});
                    setEmailApiError('');
                    setEmailSuccess(false);
                  }}
                  className="btn btn-secondary"
                  disabled={emailLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={emailLoading}
                >
                  {emailLoading ? 'Changing...' : 'Change Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Change Password</h2>
            {passwordSuccess && (
              <div className="alert alert-success">
                Password changed successfully!
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="form">
              <div className="form-group">
                <label htmlFor="current-password" className="form-label">Current Password</label>
                <input
                  type="password"
                  id="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  disabled={passwordLoading}
                  className="form-input"
                  placeholder="Enter current password"
                />
                {passwordErrors.currentPassword && <span className="form-error">{passwordErrors.currentPassword}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="new-password" className="form-label">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  disabled={passwordLoading}
                  className="form-input"
                  placeholder="Enter new password (min 6 characters)"
                />
                {passwordErrors.newPassword && <span className="form-error">{passwordErrors.newPassword}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password" className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  disabled={passwordLoading}
                  className="form-input"
                  placeholder="Confirm new password"
                />
                {passwordErrors.confirmPassword && <span className="form-error">{passwordErrors.confirmPassword}</span>}
              </div>
              {passwordApiError && <div className="alert alert-error">{passwordApiError}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setPasswordErrors({});
                    setPasswordApiError('');
                    setPasswordSuccess(false);
                  }}
                  className="btn btn-secondary"
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
