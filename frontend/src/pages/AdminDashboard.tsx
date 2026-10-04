import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { AdminUser, AdminAvailability } from '../types/admin';
import Skeleton from '../components/Skeleton';

function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [availability, setAvailability] = useState<AdminAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersResponse, availabilityResponse] = await Promise.all([
          api.get<AdminUser[]>('/admin/users'),
          api.get<AdminAvailability>('/admin/availability'),
        ]);
        setUsers(usersResponse.data);
        setAvailability(availabilityResponse.data);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const error = err as { response?: { data?: { message?: string } } };
          if (error.response?.data?.message) {
            setError(error.response.data.message);
          } else {
            setError('Failed to load admin data');
          }
        } else {
          setError('Failed to load admin data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleAvailability = async () => {
    if (!availability) return;
    try {
      const response = await api.patch<AdminAvailability>('/admin/availability', {
        isOnline: !availability.isOnline,
      });
      setAvailability(response.data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to update availability');
        }
      } else {
        setError('Failed to update availability');
      }
    }
  };

  if (loading) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">System overview and management</p>
        </div>
        <div className="card">
          <div className="card-body">
            <Skeleton variant="text" style={{ height: '24px', width: '200px', marginBottom: '16px' }} />
            <Skeleton variant="text" style={{ height: '20px', width: '100%', marginBottom: '12px' }} />
            <Skeleton variant="text" style={{ height: '20px', width: '100%', marginBottom: '12px' }} />
            <Skeleton variant="text" style={{ height: '20px', width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">System overview and management</p>
        </div>
        <div className="alert alert-error">
          {error}
        </div>
      </div>
    );
  }

  const userCount = users.length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const regularUserCount = users.filter(u => u.role === 'USER').length;

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System overview and management</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Total Users</h3>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '600' }}>{userCount}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Admins</h3>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '600' }}>{adminCount}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Regular Users</h3>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '600' }}>{regularUserCount}</div>
          </div>
        </div>
      </div>

      {/* Support Availability */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2 className="card-title">Support Availability</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>
                {availability?.isOnline ? 'Online' : 'Offline'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {availability?.isOnline ? 'You are available for support chats' : 'You are not available for support chats'}
              </div>
            </div>
            <button
              onClick={toggleAvailability}
              className={`btn ${availability?.isOnline ? 'btn-danger' : 'btn-primary'}`}
            >
              {availability?.isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <Link to="/admin/users" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Manage Users
            </Link>
            <Link to="/admin/support" className="btn btn-secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Support Chats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
